import { readFile } from 'fs/promises';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { taskReferenceLinks, externalReferences } from '../../db/schema';
import { getReferenceManualRawTextPath } from '../../storage/ReferenceManualPaths';
import { loadCmmTextIndex, getTextForPages } from '../../storage/CMMSectionContent';
import { SECTION_EXTRACTION_KIND } from '../../common/sectionExtractionKind';
import { SECTION_TASK_PROMPT_BUILDERS } from '../../common/sectionTaskPromptRegistry';
import { readExtractionResult, saveExtractionResult } from '../../common/extractionResultStorage';
import { extractTasksAndTools } from './taskExtraction';
import { registerTaskReferences } from './registerTaskReferences';
import type { PageText } from '../../ipc/pdfExtraction';
import type { SectionRange } from '../../common/pageClassification';
import type { SectionExtractionResult, Task } from '../../../shared/types/sections';

export interface TaskRef {
  cmmId: number;
  sectionId: string;
  taskId: string;
}

function getTaskPageBounds(
  sectionId: string,
  sections: SectionRange[],
  task: Task,
  allTasks: Task[],
): { startPage: number; endPage: number } {
  const sorted = [...allTasks].sort((a, b) => a.sourcePage - b.sourcePage);
  const index = sorted.findIndex((t) => t.id === task.id);
  const next = sorted[index + 1];

  if (next) {
    return { startPage: task.sourcePage, endPage: Math.max(task.sourcePage, next.sourcePage - 1) };
  }

  const thisSection = sections.find((s) => s.sectionId === sectionId);
  return { startPage: task.sourcePage, endPage: thisSection?.endPage ?? task.sourcePage };
}

async function loadResolvedExternalContent(
  cmmId: number,
  sectionId: string,
  taskId: string,
): Promise<{ sectionId: string; content: string }[]> {
  const links = await db
    .select({
      manualType: externalReferences.manualType,
      rawDocNumber: externalReferences.rawDocNumber,
      resolvedManualId: externalReferences.resolvedManualId,
      resolvedStartPage: externalReferences.resolvedStartPage,
      resolvedEndPage: externalReferences.resolvedEndPage,
    })
    .from(taskReferenceLinks)
    .innerJoin(externalReferences, eq(taskReferenceLinks.externalReferenceId, externalReferences.id))
    .where(
      and(
        eq(taskReferenceLinks.cmmId, cmmId),
        eq(taskReferenceLinks.sectionId, sectionId),
        eq(taskReferenceLinks.taskId, taskId),
      ),
    );

  const resolvedContent: { sectionId: string; content: string }[] = [];

  for (const link of links) {
    if (!link.resolvedManualId || link.resolvedStartPage == null || link.resolvedEndPage == null) {
      continue; 
    }

    const rawTextJson = await readFile(getReferenceManualRawTextPath(link.resolvedManualId), 'utf-8');
    const pages = JSON.parse(rawTextJson) as PageText[];
    const rawTextByPage = new Map(pages.map((p) => [p.page, p.text]));

    const pageNumbers: number[] = [];
    for (let p = link.resolvedStartPage; p <= link.resolvedEndPage; p += 1) pageNumbers.push(p);

    const content = pageNumbers
      .map((page) => `--- PAGE ${page} ---\n${rawTextByPage.get(page) ?? ''}`)
      .join('\n\n');

    resolvedContent.push({
      sectionId: `${link.manualType} ${link.rawDocNumber}`,
      content,
    });
  }

  return resolvedContent;
}

async function allReferencesResolved(cmmId: number, sectionId: string, taskId: string): Promise<boolean> {
  const links = await db
    .select({ status: externalReferences.status })
    .from(taskReferenceLinks)
    .innerJoin(externalReferences, eq(taskReferenceLinks.externalReferenceId, externalReferences.id))
    .where(
      and(
        eq(taskReferenceLinks.cmmId, cmmId),
        eq(taskReferenceLinks.sectionId, sectionId),
        eq(taskReferenceLinks.taskId, taskId),
      ),
    );

  return links.length > 0 && links.every((l) => l.status === 'resolved');
}

export async function reExtractSingleTask({ cmmId, sectionId, taskId }: TaskRef): Promise<SectionExtractionResult> {
  const kind = SECTION_EXTRACTION_KIND[sectionId];
  const promptBuilders = SECTION_TASK_PROMPT_BUILDERS[sectionId];
  if (!kind || !promptBuilders) {
    throw new Error(`No re-extraction pipeline registered for section "${sectionId}"`);
  }

  const result = await readExtractionResult(cmmId, kind, sectionId);
  if (!result) {
    throw new Error(`No cached extraction result found for CMM ${cmmId}, section "${sectionId}"`);
  }

  const task = result.tasks.find((t) => t.id === taskId);
  if (!task) {
    throw new Error(`Task "${taskId}" not found in cached result for section "${sectionId}"`);
  }

  const ready = await allReferencesResolved(cmmId, sectionId, taskId);
  if (!ready) {
    throw new Error(`Task "${taskId}" still has unresolved external references`);
  }

  const textIndex = await loadCmmTextIndex(cmmId);
  const { startPage, endPage } = getTaskPageBounds(sectionId, textIndex.sections, task, result.tasks);
  const taskPages: number[] = [];
  for (let p = startPage; p <= endPage; p += 1) taskPages.push(p);
  const taskContent = getTextForPages(textIndex, taskPages);

  const resolvedContent = await loadResolvedExternalContent(cmmId, sectionId, taskId);

  const { tasks: reExtractedTasks } = await extractTasksAndTools(
    taskContent,
    resolvedContent,
    promptBuilders.system,
    promptBuilders.user,
  );

  const updatedTask =
    reExtractedTasks.find((t) => t.id === task.id) ?? reExtractedTasks[0] ?? task;

  if (!reExtractedTasks.find((t) => t.id === task.id)) {
    console.warn(
      `[reExtractSingleTask] re-extraction for "${taskId}" returned a different/no matching id — using first result as best effort`,
    );
  }

  result.tasks = result.tasks.map((t) => (t.id === taskId ? updatedTask : t));
  await saveExtractionResult(kind, result);

  await registerTaskReferences(cmmId, sectionId, updatedTask);

  return result;
}