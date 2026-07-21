import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const cmms = pgTable('cmms', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  cmmNumber: text('cmm_number'),
  manufacturer: text('manufacturer'),
  revision: text('revision'),
  revisionDate: timestamp('revision_date'),
  filePath: text('file_path'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});