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
    '- Report sourcePage: the page number from the nearest preceding "--- PAGE <number> ---" marker',
    '  above where the task begins.',
    '- Break it into sub-tasks as a simple ordered list (id + description only). Sub-tasks do NOT carry',
    '  their own tools or consumables — those are captured once at the task level, below.',
    '- List every tool required to complete the task, in detail: name, part number if stated, quantity if stated.',
    '  This should cover the tools needed across all of the task\'s sub-tasks combined.',
    '- List every consumable required to complete the task, in detail: name, part number if stated, quantity if stated.',
    '  This should cover the consumables needed across all of the task\'s sub-tasks combined.',
    '',
    'Respond ONLY with strict json in the following shape, with no extra commentary:',
    '',
    'EXAMPLE JSON OUTPUT:',
    '{',
    '  "tasks": [',
    '    {',
    '      "id": "T1",',
    '      "title": "Continuity Check",',
    '      "sourcePage": 74,',
    '      "subTasks": [',
    '        { "id": "T1.1", "description": "Set multimeter to continuity mode" },',
    '        { "id": "T1.2", "description": "Probe pins 3 and 7 and confirm reading" }',
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