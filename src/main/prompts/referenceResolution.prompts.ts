export function buildSectionResolutionPrompt(
  citation: { manualType: string; rawDocNumber: string },
  candidateSections: { sectionId: string; snippet: string }[],
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    'You are matching a citation from one manual to the section it refers to in another manual.',
    'You will be given the citation (manual type and the number/heading as printed) and a list of',
    "the target manual's own sections, each with a short snippet of that section's actual page content.",
    'Pick the ONE sectionId that this citation most plausibly refers to. If none plausibly match,',
    'return null rather than guessing.',
    '',
    'Respond ONLY with strict json in this exact shape, no other text:',
    '{ "sectionId": string | null }',
  ].join('\n');

  const userPrompt = [
    `CITATION: ${citation.manualType} ${citation.rawDocNumber}`,
    '',
    'CANDIDATE SECTIONS:',
    ...candidateSections.map((c) => `[${c.sectionId}] ${c.snippet}`),
  ].join('\n');

  return { systemPrompt, userPrompt };
}