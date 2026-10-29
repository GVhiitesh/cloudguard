import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/db';

type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditEntry {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Writes an audit row. Pass the transaction client when the audited write is
 * itself inside a transaction, so the log lands atomically with the change.
 */
export async function writeAudit(entry: AuditEntry, db: Db = prisma): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: (entry.before ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      after: (entry.after ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  });
}
