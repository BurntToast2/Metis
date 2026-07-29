import type { ExternalManualType } from '../../shared/types/sections';

export type { ExternalManualType };

// ATA-numbered manuals (SRM, AMM, NTM) reuse the same chapter/section
// numbers across different aircraft platforms, so their identity must
// include platform to avoid collisions. SOPM, SPEC, and cross-referenced
// CMMs are not airframe-specific — their identity is the manual+number
// alone, scoped as "generic" regardless of which aircraft cited them.
const PLATFORM_SCOPED_TYPES: ExternalManualType[] = ['SRM', 'AMM', 'NTM'];

/**
 * Canonicalizes a raw, as-printed document/chapter number so the same
 * underlying reference always produces the same string, regardless of
 * how any given CMM happened to format its citation.
 *
 * This is a first-pass heuristic, not an exhaustive parser — expect to
 * add rules here as real citations surface formats this doesn't catch.
 */
export function normalizeDocNumber(raw: string): string {
  let s = raw.trim().toUpperCase();

  // Strip leading labels ("Chapter 53-30-01" -> "53-30-01")
  s = s.replace(/^(CHAPTER|CHAP|SECTION|SEC|REF\.?)\s*/i, '');

  // Drop parenthetical revision suffixes ("53-30-01 (Rev 4)" -> "53-30-01")
  s = s.replace(/\(REV[^)]*\)/i, '').trim();

  // Unify whitespace/dot separators to hyphens
  s = s.replace(/[.\s]+/g, '-');
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');

  // ATA chapters are sometimes printed with no separator at all
  // ("533001" -> "53-30-01")
  if (/^\d{6}$/.test(s)) {
    s = `${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
  }

  return s;
}

/**
 * Canonicalizes a platform/aircraft-model string so the same aircraft
 * always produces the same comparison value, regardless of whether it
 * came from a CMM's extracted metadata or a manually-entered manual
 * upload. Used both inside buildReferenceKey and directly wherever a
 * platform value is stored in the DB, so equality-based lookups
 * (external_references.platform = reference_manuals.platform) actually
 * match instead of missing on casing/whitespace differences alone.
 */
export function normalizePlatform(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Builds the canonical key used to deduplicate a citation across every
 * CMM in the library. Two different CMMs citing the same manual+chapter
 * (and, where applicable, the same platform) must always produce this
 * same string, since that's what lets a single upload satisfy every
 * outstanding citation for it at once.
 */
export function buildReferenceKey(
  manualType: ExternalManualType,
  platform: string | null,
  rawDocNumber: string,
): string {
  const doc = normalizeDocNumber(rawDocNumber);
  const scope = PLATFORM_SCOPED_TYPES.includes(manualType)
    ? normalizePlatform(platform ?? 'unspecified')
    : 'generic';

  return `${manualType.toLowerCase()}/${scope}/${doc}`;
}

export function isPlatformScoped(manualType: ExternalManualType): boolean {
  return PLATFORM_SCOPED_TYPES.includes(manualType);
}