import {
  buildTaskExtractionSystemPrompt as buildTestingSystemPrompt,
  buildTaskExtractionUserPrompt as buildTestingUserPrompt,
} from '../prompts/testingExtraction.prompts';
import {
  buildCleaningTaskExtractionSystemPrompt as buildCleaningSystemPrompt,
  buildCleaningTaskExtractionUserPrompt as buildCleaningUserPrompt,
} from '../prompts//cleaningExtraction.prompts';
import {
  buildInspectionTaskExtractionSystemPrompt as buildInspectionSystemPrompt,
  buildInspectionTaskExtractionUserPrompt as buildInspectionUserPrompt,
} from '../prompts/inspectionExtraction.prompts';
import {
  buildRepairsTaskExtractionSystemPrompt as buildRepairsSystemPrompt,
  buildRepairsTaskExtractionUserPrompt as buildRepairsUserPrompt,
} from '../prompts/repairsExtraction.prompts';

interface TaskPromptBuilders {
  system: () => string;
  user: (sectionContent: string, referencedSections: { sectionId: string; content: string }[]) => string;
}

// Lets reExtractSingleTask call the SAME task-extraction prompt a section
// normally uses (same tool/consumable rules, same JSON shape) without
// needing to know which section it's dealing with beyond the sectionId —
// one registry, no per-section branching in the re-extraction logic itself.
export const SECTION_TASK_PROMPT_BUILDERS: Record<string, TaskPromptBuilders> = {
  'testing-fault-isolation': { system: buildTestingSystemPrompt, user: buildTestingUserPrompt },
  cleaning: { system: buildCleaningSystemPrompt, user: buildCleaningUserPrompt },
  'inspection-check': { system: buildInspectionSystemPrompt, user: buildInspectionUserPrompt },
  repairs: { system: buildRepairsSystemPrompt, user: buildRepairsUserPrompt },
};