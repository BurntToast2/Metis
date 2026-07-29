import { pgTable, serial, integer, text, timestamp, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';

export const externalManualTypeEnum = pgEnum('external_manual_type', [
  'SRM',
  'SOPM',
  'AMM',
  'NTM',
  'CMM',
  'IPC',
  'SPEC',
  'OTHER',
]);

export const externalReferenceStatusEnum = pgEnum('external_reference_status', [
  'pending',
  'resolved',
]);

export const cmms = pgTable('cmms', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  cmmNumber: text('cmm_number'),
  manufacturer: text('manufacturer'),
  revision: text('revision'),
  revisionDate: timestamp('revision_date'),
  filePath: text('file_path'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  // Aircraft applicability, e.g. "737-800". Extracted the same way as
  // cmmNumber/manufacturer (one more field in buildMetadataPrompt), left
  // nullable since not every CMM's front matter states it clearly. Only
  // consulted when building a key for a platform-scoped manual type
  // (SRM/AMM/NTM) — everything else ignores it.
  platform: text('platform'),
});

// Pointer row only, matching the cmms convention — the actual PDF,
// raw-text.json, and this manual's own sections.json (its chapter map,
// with open-ended sectionIds rather than your 14 known CMM section IDs)
// all live on disk under storage/reference-manuals/{id}/, resolved via
// filePath the same way getCmmFolderPath resolves a CMM's folder.
export const referenceManuals = pgTable('reference_manuals', {
  id: serial('id').primaryKey(),
  manualType: externalManualTypeEnum('manual_type').notNull(),
  // Null for manual types that aren't airframe-specific (SOPM, SPEC, CMM
  // cross-refs) — those are scoped as "generic" rather than by platform.
  platform: text('platform'),
  filePath: text('file_path'),
  ingestedAt: timestamp('ingested_at').defaultNow(),
});

// One row per distinct cited key, deduplicated across every CMM that
// cites it. rawDocNumber is kept alongside normalizedKey purely for
// display/debugging — normalizedKey is the only thing ever queried on.
// resolvedSectionId/StartPage/EndPage are a cached copy of a row that
// also exists in the resolved manual's own sections.json — kept here so a
// resolved lookup never needs to open that file, at the cost of needing
// both kept in sync if a manual is ever re-classified.
export const externalReferences = pgTable(
  'external_references',
  {
    id: serial('id').primaryKey(),
    manualType: externalManualTypeEnum('manual_type').notNull(),
    platform: text('platform'),
    rawDocNumber: text('raw_doc_number').notNull(),
    normalizedKey: text('normalized_key').notNull(),
    status: externalReferenceStatusEnum('status').notNull().default('pending'),
    resolvedManualId: integer('resolved_manual_id').references(() => referenceManuals.id),
    resolvedSectionId: text('resolved_section_id'),
    resolvedStartPage: integer('resolved_start_page'),
    resolvedEndPage: integer('resolved_end_page'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    normalizedKeyIdx: uniqueIndex('external_references_normalized_key_idx').on(table.normalizedKey),
  }),
);

// Join table linking a specific task (inside a specific CMM's section) to
// the keys it needs. taskId is a plain string, not a foreign key, because
// tasks don't live as DB rows — they live inside the JSON file written by
// runXExtraction (extractedSections/{sectionId}/{sectionId}.json). This
// table is the only place a task's identity is known to the database at
// all; everything else about the task stays on disk.
export const taskReferenceLinks = pgTable(
  'task_reference_links',
  {
    id: serial('id').primaryKey(),
    cmmId: integer('cmm_id')
      .notNull()
      .references(() => cmms.id),
    sectionId: text('section_id').notNull(),
    taskId: text('task_id').notNull(),
    externalReferenceId: integer('external_reference_id')
      .notNull()
      .references(() => externalReferences.id),
  },
  (table) => ({
    taskRefIdx: uniqueIndex('task_reference_links_unique_idx').on(
      table.cmmId,
      table.sectionId,
      table.taskId,
      table.externalReferenceId,
    ),
  }),
);