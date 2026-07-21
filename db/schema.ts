import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const cmms = pgTable('cmms', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),            // e.g. "Fuel Pump Actuator CMM"
  cmmNumber: text('cmm_number'),              // the document's own reference number
  manufacturer: text('manufacturer'),         // OEM name
  revision: text('revision'),                 // e.g. "Rev 14"
  revisionDate: timestamp('revision_date'),   // date of that revision, per the CMM's own cover page
  filePath: text('file_path'),                // local path to the stored PDF
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});