import { Lifecycle, Role } from '@prisma/client';
import { AppError } from './errors';

/**
 * Legal transitions, per BACKEND.md §5.
 *
 *   ACTIVE --idle--> IDLE --confirmed--> FLAGGED --reviewed--> REVIEWED --> ARCHIVED
 *
 * "Any -> ACTIVE" is a restore and is ADMIN-only; it is therefore NOT listed here
 * and is handled as an explicit special case in assertTransition.
 */
const TRANSITIONS: Record<Lifecycle, Lifecycle[]> = {
  ACTIVE: ['IDLE', 'FLAGGED'],
  IDLE: ['ACTIVE', 'FLAGGED'],
  FLAGGED: ['REVIEWED'],
  REVIEWED: ['ARCHIVED'],
  ARCHIVED: [],
};

export const RESTORE_TARGET: Lifecycle = 'ACTIVE';

export function canTransition(from: Lifecycle, to: Lifecycle): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: Lifecycle): Lifecycle[] {
  return [...TRANSITIONS[from]];
}

/**
 * Validates a lifecycle move for a given actor role.
 * Throws AppError(400) for an illegal jump, AppError(403) for a role that may not make it.
 */
export function assertTransition(from: Lifecycle, to: Lifecycle, role: Role): void {
  if (from === to) {
    throw new AppError(400, `Resource is already ${from}`);
  }

  if (canTransition(from, to)) return;

  // Restore path: any state back to ACTIVE, ADMIN only.
  if (to === RESTORE_TARGET) {
    if (role !== 'ADMIN') {
      throw new AppError(403, `Restoring ${from} to ACTIVE requires the ADMIN role`);
    }
    return;
  }

  throw new AppError(
    400,
    `Illegal lifecycle transition ${from} -> ${to}. Allowed from ${from}: ` +
      `${allowedTransitions(from).join(', ') || '(none)'}`,
  );
}
