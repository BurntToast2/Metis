import { eq, and } from 'drizzle-orm';
import { db } from '../../db';
import { cmms, externalReferences, taskReferenceLinks } from '../../db/schema';
import type { Task } from '../../../shared/types/sections';
import {
  buildReferenceKey,
  isPlatformScoped,
  normalizePlatform,
} from '../../common/referenceKey';
import { tryResolveAgainstExistingManuals } from '../referenceManuals/referenceResolution.service';

/**
 * Finds the existing external_references row for this key, or creates one
 * as 'pending'. Returns the row either way, plus whether it was newly
 * created — resolution is only worth attempting on a fresh row, since an
 * existing row was already attempted when it was first registered.
 */
async function findOrCreateExternalReference(
  normalizedKey: string,
  manualType: string,
  platform: string | null,
  rawDocNumber: string,
): Promise<{ id: number; wasCreated: boolean }> {
  const [existing] = await db
    .select({ id: externalReferences.id })
    .from(externalReferences)
    .where(eq(externalReferences.normalizedKey, normalizedKey));

  if (existing) {
    return { id: existing.id, wasCreated: false };
  }

  const [inserted] = await db
    .insert(externalReferences)
    .values({
      manualType: manualType as never, // enum-typed column, validated upstream by the extraction prompt's fixed manualType list
      platform,
      rawDocNumber,
      normalizedKey,
      status: 'pending',
    })
    .onConflictDoNothing({ target: externalReferences.normalizedKey })
    .returning({ id: externalReferences.id });

  // Lost the race against a concurrent insert of the same key — the row
  // exists now even though our insert above didn't create it.
  if (!inserted) {
    const [raceWinner] = await db
      .select({ id: externalReferences.id })
      .from(externalReferences)
      .where(eq(externalReferences.normalizedKey, normalizedKey));
    return { id: raceWinner.id, wasCreated: false };
  }

  return { id: inserted.id, wasCreated: true };
}

async function linkTaskToReference(
  cmmId: number,
  sectionId: string,
  taskId: string,
  externalReferenceId: number,
): Promise<void> {
  await db
    .insert(taskReferenceLinks)
    .values({ cmmId, sectionId, taskId, externalReferenceId })
    .onConflictDoNothing({
      target: [
        taskReferenceLinks.cmmId,
        taskReferenceLinks.sectionId,
        taskReferenceLinks.taskId,
        taskReferenceLinks.externalReferenceId,
      ],
    });
}

/**
 * Called once per task, right after a section's task-extraction LLM call
 * returns. Registers every externalReferences entry the model found on
 * that task: builds its canonical key, upserts the shared registry row
 * (deduplicated across the whole library), links this specific task to
 * it, and — only for a brand-new key — checks whether an already-uploaded
 * manual can satisfy it immediately.
 *
 * Never throws on an individual reference's failure; one malformed
 * citation shouldn't take down the whole extraction result that's about
 * to be cached to disk.
 */
export async function registerTaskReferences(
  cmmId: number,
  sectionId: string,
  task: Task,
): Promise<void> {
  if (task.externalReferences.length === 0) return;

  const [cmm] = await db.select({ platform: cmms.platform }).from(cmms).where(eq(cmms.id, cmmId));
  const cmmPlatform = cmm?.platform ?? null;

  for (const ref of task.externalReferences) {
    try {
      const scoped = isPlatformScoped(ref.manualType);
      const platform = scoped && cmmPlatform ? normalizePlatform(cmmPlatform) : null;
      const key = buildReferenceKey(ref.manualType, platform, ref.rawDocNumber);

      const { id: externalReferenceId, wasCreated } = await findOrCreateExternalReference(
        key,
        ref.manualType,
        platform,
        ref.rawDocNumber,
      );

      await linkTaskToReference(cmmId, sectionId, task.id, externalReferenceId);

      if (wasCreated) {
        await tryResolveAgainstExistingManuals(externalReferenceId);
      }
    } catch (err) {
      console.error(
        `[registerTaskReferences] failed to register reference "${ref.manualType} ${ref.rawDocNumber}" for task "${task.id}":`,
        err,
      );
    }
  }
}