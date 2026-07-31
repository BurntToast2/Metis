export const EXTERNAL_REFERENCE_EXTRACTION_INSTRUCTIONS = [
  'EXTERNAL MANUAL REFERENCES — for every task, also capture any reference to a DIFFERENT manual',
  '(not a top-level section of THIS document) that the task or its procedure cites — e.g.',
  '"Refer to SRM 53-30-01", "See SOPM 20-30-05", "Per AMM 12-21-00", "Overhaul per CMM 24-11-05".',
  'For each one found:',
  '- manualType: one of "SRM", "SOPM", "AMM", "NTM", "CMM", "IPC", "SPEC", "OTHER" — classify by what',
  '  kind of manual is named. Never invent a type outside this list.',
  '- rawDocNumber: the chapter/document number or heading EXACTLY as printed in the source text —',
  '  do not normalize punctuation, do not guess a number that is not actually written.',
  '- reason: a short note on what the task needs from it (e.g. "Repair limits for bonded doubler").',
  '',
  'Do NOT report this for references to sections WITHIN this same document — those are handled',
  'separately and are not external references.',
].join('\n');


export const EXTERNAL_REFERENCE_JSON_EXAMPLE = [
  '      "externalReferences": [',
  '        { "manualType": "SRM", "rawDocNumber": "53-30-01", "reason": "Repair limits for bonded doubler" }',
  '      ]',
].join('\n');