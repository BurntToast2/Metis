import { getStructuredCompletion } from '../../ipc/llm';
import {
  buildTaskExtractionSystemPrompt,
  buildTaskExtractionUserPrompt,
} from '../../prompts/testingExtraction.prompts';
import type { TaskExtractionResponse } from './testing.types';

export async function extractTasksAndTools(
  testingSectionContent: string,
  referencedSections: { sectionId: string; content: string }[],
): Promise<TaskExtractionResponse> {
  const systemPrompt = buildTaskExtractionSystemPrompt();
  const userPrompt = buildTaskExtractionUserPrompt(testingSectionContent, referencedSections);
  
  return getStructuredCompletion<TaskExtractionResponse>(systemPrompt, userPrompt, {
    thinking: true,
    maxTokens: 100000,
  });
}