import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { taskReferenceLinks, externalReferences } from '../../db/schema';
import type { MissingReference } from '../../../shared/types/referenceManuals';

/**
 * Every still-pending external reference cited by any task in this
 * section, grouped by key — one card per key, listing which tasks in
 * this section need it. Deliberately scoped to a single section rather
 * than the whole CMM, since that's what the task-breakdown page actually
 * renders.
 */
export async function getMissingReferencesForSection(
  cmmId: number,
  sectionId: string,
): Promise<MissingReference[]> {
  const rows = await db
    .select({
      key: externalReferences.normalizedKey,
      manualType: externalReferences.manualType,
      rawDocNumber: externalReferences.rawDocNumber,
      platform: externalReferences.platform,
      taskId: taskReferenceLinks.taskId,
    })
    .from(taskReferenceLinks)
    .innerJoin(externalReferences, eq(taskReferenceLinks.externalReferenceId, externalReferences.id))
    .where(
      and(
        eq(taskReferenceLinks.cmmId, cmmId),
        eq(taskReferenceLinks.sectionId, sectionId),
        eq(externalReferences.status, 'pending'),
      ),
    );

  const byKey = new Map<string, MissingReference>();
  for (const row of rows) {
    const existing = byKey.get(row.key);
    if (existing) {
      existing.taskIds.push(row.taskId);
    } else {
      byKey.set(row.key, {
        key: row.key,
        manualType: row.manualType as MissingReference['manualType'],
        rawDocNumber: row.rawDocNumber,
        platform: row.platform,
        taskIds: [row.taskId],
      });
    }
  }

  return [...byKey.values()];
}

/**
 * Cheap per-task check used right after a re-extraction becomes possible
 * (or to decide whether to show a "ready" state on a task card) — true
 * only once every reference that specific task cited is resolved.
 */
export async function isTaskFullyResolved(
  cmmId: number,
  sectionId: string,
  taskId: string,
): Promise<boolean> {
  const rows = await db
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

  return rows.length > 0 && rows.every((r) => r.status === 'resolved');
}