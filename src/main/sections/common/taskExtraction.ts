// common/taskExtraction.ts
import { getStructuredCompletion } from '../../ipc/llm';
import type { TaskExtractionResponse } from './section.types';

export async function extractTasksAndTools(
  sectionContent: string,
  referencedSections: { sectionId: string; content: string }[],
  buildSystemPrompt: () => string,
  buildUserPrompt: (
    sectionContent: string,
    referencedSections: { sectionId: string; content: string }[],
  ) => string,
): Promise<TaskExtractionResponse> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(sectionContent, referencedSections);

  return getStructuredCompletion<TaskExtractionResponse>(systemPrompt, userPrompt, {
    thinking: true,
    maxTokens: 100000,
  });
}