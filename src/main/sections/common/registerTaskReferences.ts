import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { cmms, externalReferences, taskReferenceLinks } from '../../db/schema';
import type { Task } from '../../../shared/types/sections';
import {
  buildReferenceKey,
  isPlatformScoped,
  normalizePlatform,
} from '../../common/referenceKey';
import { tryResolveAgainstExistingManuals } from '../referenceManuals/referenceResolution.service';

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
      manualType: manualType as never, 
      platform,
      rawDocNumber,
      normalizedKey,
      status: 'pending',
    })
    .onConflictDoNothing({ target: externalReferences.normalizedKey })
    .returning({ id: externalReferences.id });

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