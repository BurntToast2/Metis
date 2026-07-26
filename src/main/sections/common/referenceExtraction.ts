import { getStructuredCompletion } from '../../ipc/llm';
import type { ReferenceFinderResponse } from './section.types';

export async function findReferencedSections(
  sectionContent: string,
  validSectionIds: string[],
  buildSystemPrompt: (validSectionIds: string[]) => string,
  buildUserPrompt: (sectionContent: string) => string,
): Promise<ReferenceFinderResponse> {
  const systemPrompt = buildSystemPrompt(validSectionIds);
  const userPrompt = buildUserPrompt(sectionContent);

  return getStructuredCompletion<ReferenceFinderResponse>(systemPrompt, userPrompt, {
    thinking: false,
    maxTokens: 2000,
  });
}