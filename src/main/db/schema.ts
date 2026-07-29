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
  // nullable since not every CMM's front matter states it clearly.
  platform: text('platform'),
});

export const referenceManuals = pgTable('reference_manuals', {
  id: serial('id').primaryKey(),
  manualType: externalManualTypeEnum('manual_type').notNull(),
  platform: text('platform'),
  filePath: text('file_path'),
  ingestedAt: timestamp('ingested_at').defaultNow(),
});

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