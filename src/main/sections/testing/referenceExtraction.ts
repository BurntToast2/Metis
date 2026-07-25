import { getStructuredCompletion } from '../../ipc/llm';
import {
  buildReferenceFinderSystemPrompt,
  buildReferenceFinderUserPrompt,
} from '../../prompts/testingExtraction.prompts';
import type { ReferenceFinderResponse } from './testing.types';

export async function findReferencedSections(
  testingSectionContent: string,
  validSectionIds: string[],
): Promise<ReferenceFinderResponse> {
  const systemPrompt = buildReferenceFinderSystemPrompt(validSectionIds);
  const userPrompt = buildReferenceFinderUserPrompt(testingSectionContent);

  return getStructuredCompletion<ReferenceFinderResponse>(systemPrompt, userPrompt, {
    thinking: false,
    maxTokens: 2000,
  });
}