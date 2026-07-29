import fs from 'fs/promises';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db';
import { externalReferences, referenceManuals } from '../../db/schema';
import {
  getReferenceManualSectionsPath,
  getReferenceManualRawTextPath,
} from '../../storage/ReferenceManualPaths';
import type { SectionRange } from '../../common/pageClassification';
import type { PageText } from '../../ipc/pdfExtraction';
import { normalizeDocNumber } from '../../common/referenceKey';
import { getStructuredCompletion } from '../../ipc/llm';
import { buildSectionResolutionPrompt } from '../../prompts/referenceResolution.prompts';

async function readManualSections(manualId: number): Promise<SectionRange[]> {
  const raw = await fs.readFile(getReferenceManualSectionsPath(manualId), 'utf-8');
  return JSON.parse(raw) as SectionRange[];
}

async function readManualRawText(manualId: number): Promise<PageText[]> {
  const raw = await fs.readFile(getReferenceManualRawTextPath(manualId), 'utf-8');
  return JSON.parse(raw) as PageText[];
}

function getSectionSnippet(rawText: PageText[], section: SectionRange, wordsPerEnd = 20): string {
  const page = rawText.find((p) => p.page === section.startPage);
  if (!page) return '';
  const words = page.text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, wordsPerEnd).join(' ');
}

/**
 * Deterministic prefix match — free, exact, no LLM call. Tries the full
 * citation first, then progressively coarser prefixes ("53-30-01" ->
 * "53-30" -> "53"), since a citation can be more granular than whatever
 * running header the manual's own page-classifier happened to resolve.
 */
function resolveByPrefixMatch(rawDocNumber: string, sections: SectionRange[]): SectionRange | null {
  const citationSegments = normalizeDocNumber(rawDocNumber).split('-');
  const normalizedSections = sections.map((s) => ({
    section: s,
    norm: normalizeDocNumber(s.sectionId),
  }));

  for (let len = citationSegments.length; len > 0; len--) {
    const candidate = citationSegments.slice(0, len).join('-');
    const match = normalizedSections.find((s) => s.norm === candidate);
    if (match) return match.section;
  }
  return null;
}

/**
 * LLM fallback — only reached when prefix matching finds nothing. Closed-
 * set pick from a list, not open retrieval: it either names one of the
 * given sectionIds or returns null, never invents an answer.
 */
async function resolveByLLMPick(
  manualType: string,
  rawDocNumber: string,
  sections: SectionRange[],
  rawText: PageText[],
): Promise<SectionRange | null> {
  const candidates = sections.map((s) => ({
    sectionId: s.sectionId,
    snippet: getSectionSnippet(rawText, s),
  }));

  const { systemPrompt, userPrompt } = buildSectionResolutionPrompt(
    { manualType, rawDocNumber },
    candidates,
  );

  const { sectionId } = await getStructuredCompletion<{ sectionId: string | null }>(
    systemPrompt,
    userPrompt,
  );

  if (!sectionId) return null;
  return sections.find((s) => s.sectionId === sectionId) ?? null;
}

async function markResolved(
  externalReferenceId: number,
  manualId: number,
  match: SectionRange,
): Promise<void> {
  await db
    .update(externalReferences)
    .set({
      status: 'resolved',
      resolvedManualId: manualId,
      resolvedSectionId: match.sectionId,
      resolvedStartPage: match.startPage,
      resolvedEndPage: match.endPage,
    })
    .where(eq(externalReferences.id, externalReferenceId));
}

async function attemptResolve(
  manualId: number,
  rawDocNumber: string,
  manualType: string,
  sections: SectionRange[],
): Promise<SectionRange | null> {
  const prefixMatch = resolveByPrefixMatch(rawDocNumber, sections);
  if (prefixMatch) return prefixMatch;

  const rawText = await readManualRawText(manualId);
  return resolveByLLMPick(manualType, rawDocNumber, sections, rawText);
}

/**
 * Runs right after a manual is ingested — finds every still-pending
 * citation matching this manual's type (and platform, if scoped) and
 * attempts to resolve each against it. One upload can satisfy citations
 * registered by many different CMMs at once, since external_references is
 * deduplicated across the whole library rather than per-CMM.
 */
export async function resolvePendingReferencesForManual(manualId: number): Promise<void> {
  const [manual] = await db.select().from(referenceManuals).where(eq(referenceManuals.id, manualId));
  if (!manual) return;

  const platformFilter =
    manual.platform === null
      ? isNull(externalReferences.platform)
      : eq(externalReferences.platform, manual.platform);

  const pending = await db
    .select()
    .from(externalReferences)
    .where(
      and(
        eq(externalReferences.status, 'pending'),
        eq(externalReferences.manualType, manual.manualType),
        platformFilter,
      ),
    );

  if (pending.length === 0) return;

  const sections = await readManualSections(manualId);

  for (const ref of pending) {
    const match = await attemptResolve(manualId, ref.rawDocNumber, ref.manualType, sections);
    if (match) await markResolved(ref.id, manualId, match);
  }
}

/**
 * Runs right after a brand-new citation is registered — checks whether
 * any manual already sitting in the common store (matching type and
 * platform) can satisfy it immediately, so the second CMM to cite an
 * already-uploaded manual never shows a missing-reference card at all.
 */
export async function tryResolveAgainstExistingManuals(externalReferenceId: number): Promise<void> {
  const [ref] = await db
    .select()
    .from(externalReferences)
    .where(eq(externalReferences.id, externalReferenceId));
  if (!ref || ref.status === 'resolved') return;

  const platformFilter =
    ref.platform === null
      ? isNull(referenceManuals.platform)
      : eq(referenceManuals.platform, ref.platform);

  const candidateManuals = await db
    .select()
    .from(referenceManuals)
    .where(and(eq(referenceManuals.manualType, ref.manualType), platformFilter));

  for (const manual of candidateManuals) {
    const sections = await readManualSections(manual.id);
    const match = await attemptResolve(manual.id, ref.rawDocNumber, ref.manualType, sections);
    if (match) {
      await markResolved(ref.id, manual.id, match);
      return; // resolved — no need to check remaining candidate manuals
    }
  }
}