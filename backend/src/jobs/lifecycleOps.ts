import { Lifecycle, Prisma } from '@prisma/client';
import { writeAudit } from '../lib/audit';
import { canTransition } from '../lib/lifecycle';
import { logger } from '../config/logger';

/** Audit actor id used by cron jobs, which have no logged-in user. */
export const SYSTEM_ACTOR = 'SYSTEM';

/**
 * Lifecycle move made by a background job.
 *
 * Unlike the HTTP path this never throws on an illegal jump — a job must not
 * abort a whole sweep because one resource is in an unexpected state. It skips
 * and logs instead, and returns whether the move happened.
 */
export async function systemTransition(
  tx: Prisma.TransactionClient,
  resource: { id: string; name: string; lifecycle: Lifecycle; idleSince: Date | null },
  to: Lifecycle,
  reason: string,
): Promise<boolean> {
  if (resource.lifecycle === to) return false;

  if (!canTransition(resource.lifecycle, to)) {
    logger.debug(
      { resourceId: resource.id, from: resource.lifecycle, to },
      'Skipping illegal automatic lifecycle transition',
    );
    return false;
  }

  await tx.resource.update({
    where: { id: resource.id },
    data: {
      lifecycle: to,
      ...(to === 'IDLE' ? { idleSince: resource.idleSince ?? new Date() } : { idleSince: null }),
    },
  });

  await writeAudit(
    {
      actorId: SYSTEM_ACTOR,
      action: 'LIFECYCLE_CHANGE',
      entity: 'Resource',
      entityId: resource.id,
      before: { lifecycle: resource.lifecycle },
      after: { lifecycle: to, reason },
    },
    tx,
  );

  return true;
}
