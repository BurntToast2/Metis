export function buildReferenceFinderSystemPrompt(validSectionIds: string[]): string {
  return [
    'You are an aircraft component maintenance manual (CMM) analyst.',
    'You will be given the content of a "Testing and Fault Isolation" section.',
    'Identify every explicit reference this section makes to another TOP-LEVEL SECTION of the manual',
    '(e.g. "Refer to Disassembly", "See Special Tools, Fixtures, Equipment and Consumables").',
    '',
    `A reference is only reportable if its sectionId is EXACTLY one of these: ${validSectionIds.join(', ')}.`,
    'Do NOT report references to tables, figures, illustrations, torque values, part numbers, or anything',
    'else that is not itself one of the section IDs above — those are not separate resolvable sections and',
    'their content is not tracked outside of whichever section it physically appears in.',
    '',
    'Respond ONLY with strict json in the following shape, with no extra commentary:',
    '',
    'EXAMPLE JSON OUTPUT:',
    '{',
    '  "referencedSections": [',
    `    { "sectionId": "${validSectionIds[0] ?? 'disassembly'}", "reason": "Referenced for component removal sequence" }`,
    '  ]',
    '}',
    '',
    'If the section makes no references to other sections, return:',
    '{ "referencedSections": [] }',
  ].join('\n');
}

export function buildReferenceFinderUserPrompt(testingSectionContent: string): string {
  return `SECTION CONTENT:\n\n${testingSectionContent}\n\nIdentify every reference to another section, per the json format described.`;
}

export function buildTaskExtractionSystemPrompt(): string {
  return [
    'You are an aircraft component maintenance manual (CMM) analyst.',
    'You will be given a "Testing and Fault Isolation" section, and the content of any sections it references.',
    'The text is broken into pages, each preceded by a marker in the form "--- PAGE <number> ---".',
    'Split the testing section into its tasks. For each task:',
    '- id: use the task\'s OWN identifier exactly as printed in the source text (e.g. a line reading',
    '  "TASK 33-51-17-700-801-A00" means the id is "33-51-17-700-801-A00"). Do not invent your own',
    '  numbering — copy the real identifier from the document. If a task genuinely has no printed',
    '  identifier, use its exact printed heading text as the id instead (e.g. "5.C. Automated Capacity Test").',
    '  The same rule applies to sub-task ids: use the printed "SUBTASK ..." identifier if present, otherwise',
    '  the printed step label (e.g. "5.C.(1)").',
    '- Report sourcePage: the page number from the nearest preceding "--- PAGE <number> ---" marker',
    '  above where the task begins.',
    '- Break it into sub-tasks as a simple ordered list (id + description only). Sub-tasks do NOT carry',
    '  their own tools or consumables — those are captured once at the task level, below.',
    '- List every tool required to complete the task, in detail: name, part number if stated, quantity if stated.',
    '  This has two parts, both required:',
    '  (a) If a numbered tools/equipment table (e.g. "LIST OF TOOLS AND EQUIPMENT ... TABLE 1001") is',
    '      physically printed within this task\'s own text, every item in that table belongs to this task —',
    '      include all of them here even if no single sub-task explicitly says "use tool X". The table\'s',
    '      presence under this task IS the requirement, regardless of whether a later task also uses the items.',
    '  (b) If a tool introduced under an earlier task (in that task\'s own table, per (a)) is also used again by',
    '      THIS task\'s procedure, list it again here too — do not rely on it having been listed once earlier.',
    '  Each task\'s tools list must be complete on its own, since a technician may open a single task without',
    '  reading the ones before it. Do not deduplicate across tasks.',
    '- List every consumable required to complete the task, in detail: name, part number if stated, quantity if',
    '  stated. Same two-part rule as tools (a table printed under this task belongs to this task; a consumable',
    '  reused by this task belongs to this task too, even if first named elsewhere). Also include consumables',
    '  even when they are only named inside procedural instructions rather than a numbered equipment table —',
    '  e.g. a specified wire gauge for building a test circuit, an adhesive, a lubricant, or any other material',
    '  the procedure calls for by spec. Read the full procedure text for the task, not just any equipment table',
    '  attached to it.',
    '',
    'Respond ONLY with strict json in the following shape, with no extra commentary:',
    '',
    'EXAMPLE JSON OUTPUT:',
    '{',
    '  "tasks": [',
    '    {',
    '      "id": "33-51-17-700-801-A00",',
    '      "title": "Continuity Check",',
    '      "sourcePage": 74,',
    '      "subTasks": [',
    '        { "id": "(1)", "description": "Set multimeter to continuity mode" },',
    '        { "id": "(2)", "description": "Probe pins 3 and 7 and confirm reading" }',
    '      ],',
    '      "tools": [{ "name": "Digital Multimeter", "partNumber": null, "quantity": "1" }],',
    '      "consumables": []',
    '    }',
    '  ]',
    '}',
    '',
    'If a task has no sub-tasks, return an empty subTasks array. If no tools or consumables apply,',
    'return empty arrays rather than omitting the fields.',
  ].join('\n');
}

export function buildTaskExtractionUserPrompt(
  testingSectionContent: string,
  referencedSections: { sectionId: string; content: string }[],
): string {
  const referencedBlock = referencedSections.length
    ? referencedSections
        .map((r) => `--- Referenced Section ${r.sectionId} ---\n${r.content}`)
        .join('\n\n')
    : '';

  return [
    `TESTING SECTION CONTENT:\n\n${testingSectionContent}`,
    referencedBlock ? `\n\nREFERENCED SECTIONS:\n\n${referencedBlock}` : '',
    '\n\nExtract every task, sub-task, tool, and consumable per the json format described.',
  ].join('');
}