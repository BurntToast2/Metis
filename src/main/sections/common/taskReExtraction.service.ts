import { readFile } from 'fs/promises';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { taskReferenceLinks, externalReferences } from '../../db/schema';
import { getReferenceManualRawTextPath, getReferenceManualSectionsPath } from '../../storage/ReferenceManualPaths';
import { loadCmmTextIndex, getTextForPages } from '../../storage/CMMSectionContent';
import { SECTION_EXTRACTION_KIND } from '../../common/sectionExtractionKind';
import { SECTION_TASK_PROMPT_BUILDERS } from '../../common/sectionTaskPromptRegistry';
import { readExtractionResult, saveExtractionResult } from '../../common/extractionResultStorage';
import { extractTasksAndTools } from './taskExtraction';
import { registerTaskReferences } from './registerTaskReferences';
import type { PageText } from '../../ipc/pdfExtraction';
import type { SectionRange } from '../../common/pageClassification';
import type { SectionExtractionResult, Task } from '../../../shared/types/sections';

export interface TaskRef {
  cmmId: number;
  sectionId: string;
  taskId: string;
}

/**
 * A task's own text bounds aren't tracked explicitly anywhere — only its
 * sourcePage (start) is known. Approximated here as [this task's
 * sourcePage, next task's sourcePage - 1], falling back to the section's
 * own endPage (from sections.json, via the already-loaded text index) for
 * the last task in the list. This can occasionally overshoot into the
 * next task's boilerplate; a cosmetic risk for a single re-extraction
 * call, not a structural blocker.
 */
function getTaskPageBounds(
  sectionId: string,
  sections: SectionRange[],
  task: Task,
  allTasks: Task[],
): { startPage: number; endPage: number } {
  const sorted = [...allTasks].sort((a, b) => a.sourcePage - b.sourcePage);
  const index = sorted.findIndex((t) => t.id === task.id);
  const next = sorted[index + 1];

  if (next) {
    return { startPage: task.sourcePage, endPage: Math.max(task.sourcePage, next.sourcePage - 1) };
  }

  const thisSection = sections.find((s) => s.sectionId === sectionId);
  return { startPage: task.sourcePage, endPage: thisSection?.endPage ?? task.sourcePage };
}

/**
 * Loads the resolved page-range content for every external reference this
 * task cites, formatted as {sectionId, content} pairs matching the shape
 * extractTasksAndTools already expects for intra-document referenced
 * sections. Uses the same --- PAGE <n> --- formatting as getSectionContent,
 * just applied to a reference manual's raw-text.json instead of the CMM's
 * own. Only called after confirming every reference is resolved — see the
 * check in reExtractSingleTask.
 */
async function loadResolvedExternalContent(
  cmmId: number,
  sectionId: string,
  taskId: string,
): Promise<{ sectionId: string; content: string }[]> {
  const links = await db
    .select({
      manualType: externalReferences.manualType,
      rawDocNumber: externalReferences.rawDocNumber,
      resolvedManualId: externalReferences.resolvedManualId,
      resolvedStartPage: externalReferences.resolvedStartPage,
      resolvedEndPage: externalReferences.resolvedEndPage,
    })
    .from(taskReferenceLinks)
    .innerJoin(externalReferences, eq(taskReferenceLinks.externalReferenceId, externalReferences.id))
    .where(
      and(
        eq(taskReferenceLinks.cmmId, cmmId),
        eq(taskReferenceLinks.sectionId, sectionId),
        eq(taskReferenceLinks.taskId, taskId),
      ),
    );

  const resolvedContent: { sectionId: string; content: string }[] = [];

  for (const link of links) {
    if (!link.resolvedManualId || link.resolvedStartPage == null || link.resolvedEndPage == null) {
      continue; // shouldn't happen given the caller's readiness check, but never crash on it
    }

    const rawTextJson = await readFile(getReferenceManualRawTextPath(link.resolvedManualId), 'utf-8');
    const pages = JSON.parse(rawTextJson) as PageText[];
    const rawTextByPage = new Map(pages.map((p) => [p.page, p.text]));

    const pageNumbers: number[] = [];
    for (let p = link.resolvedStartPage; p <= link.resolvedEndPage; p += 1) pageNumbers.push(p);

    const content = pageNumbers
      .map((page) => `--- PAGE ${page} ---\n${rawTextByPage.get(page) ?? ''}`)
      .join('\n\n');

    resolvedContent.push({
      sectionId: `${link.manualType} ${link.rawDocNumber}`,
      content,
    });
  }

  return resolvedContent;
}

/**
 * True only once every external reference this task cites has status
 * 'resolved' — the gate the UI checks before offering re-extraction, and
 * re-checked here defensively since this function may be called directly.
 */
async function allReferencesResolved(cmmId: number, sectionId: string, taskId: string): Promise<boolean> {
  const links = await db
    .select({ status: externalReferences.status })
    .from(taskReferenceLinks)
    .innerJoin(externalReferences, eq(taskReferenceLinks.externalReferenceId, externalReferences.id))
    .where(
      and(
        eq(taskReferenceLinks.cmmId, cmmId),
        eq(taskReferenceLinks.sectionId, sectionId),
        eq(taskReferenceLinks.taskId, taskId),
      ),
    );

  return links.length > 0 && links.every((l) => l.status === 'resolved');
}

/**
 * Re-runs extraction for a single task once every external reference it
 * cited has been resolved, feeding in the newly-available manual content
 * alongside just that task's own slice of the CMM's text. Splices the
 * updated task back into the section's cached result and re-saves it —
 * every other task in the section is left untouched.
 */
export async function reExtractSingleTask({ cmmId, sectionId, taskId }: TaskRef): Promise<SectionExtractionResult> {
  const kind = SECTION_EXTRACTION_KIND[sectionId];
  const promptBuilders = SECTION_TASK_PROMPT_BUILDERS[sectionId];
  if (!kind || !promptBuilders) {
    throw new Error(`No re-extraction pipeline registered for section "${sectionId}"`);
  }

  const result = await readExtractionResult(cmmId, kind, sectionId);
  if (!result) {
    throw new Error(`No cached extraction result found for CMM ${cmmId}, section "${sectionId}"`);
  }

  const task = result.tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task "${taskId}" not found in cached result for section "${sectionId}"`);
  }

  const ready = await allReferencesResolved(cmmId, sectionId, taskId);
  if (!ready) {
    throw new Error(`Task "${taskId}" still has unresolved external references`);
  }

  // Same loader every other extraction call uses — guarantees identical
  // --- PAGE <n> --- formatting rather than a second, parallel
  // implementation that merely looks the same.
  const textIndex = await loadCmmTextIndex(cmmId);
  const { startPage, endPage } = getTaskPageBounds(sectionId, textIndex.sections, task, result.tasks);
  const taskPages: number[] = [];
  for (let p = startPage; p <= endPage; p += 1) taskPages.push(p);
  const taskContent = getTextForPages(textIndex, taskPages);

  const resolvedContent = await loadResolvedExternalContent(cmmId, sectionId, taskId);

  const { tasks: reExtractedTasks } = await extractTasksAndTools(
    taskContent,
    resolvedContent,
    promptBuilders.system,
    promptBuilders.user,
  );

  const updatedTask =
    reExtractedTasks.find((t) => t.id === task.id) ?? reExtractedTasks[0] ?? task;

  if (!reExtractedTasks.find((t) => t.id === task.id)) {
    console.warn(
      `[reExtractSingleTask] re-extraction for "${taskId}" returned a different/no matching id — using first result as best effort`,
    );
  }

  result.tasks = result.tasks.map((t) => (t.id === taskId ? updatedTask : t));
  await saveExtractionResult(kind, result);

  // The re-extracted task may cite its own (possibly new) external
  // references — register them the same way initial extraction does.
  await registerTaskReferences(cmmId, sectionId, updatedTask);

  return result;
}