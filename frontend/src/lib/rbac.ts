import type { Role } from '@/types/api';

/**
 * Permissions the UI gates on, mapped to the roles the backend actually accepts.
 *
 * This is a convenience layer only — every one of these is enforced server-side
 * too. Hiding a button must never be the sole guard.
 */
export const PERMISSIONS = {
  VIEW: ['ADMIN', 'EDITOR', 'VIEWER'],

  CREATE_RESOURCE: ['ADMIN', 'EDITOR'],
  UPDATE_RESOURCE: ['ADMIN', 'EDITOR'],
  DELETE_RESOURCE: ['ADMIN'],
  CHANGE_LIFECYCLE: ['ADMIN', 'EDITOR'],
  /** Any state back to ACTIVE is a restore, and the backend allows only ADMIN. */
  RESTORE_LIFECYCLE: ['ADMIN'],

  UPDATE_ANOMALY: ['ADMIN', 'EDITOR'],
  APPLY_RECOMMENDATION: ['ADMIN', 'EDITOR'],

  MANAGE_BUDGETS: ['ADMIN'],
  MANAGE_USERS: ['ADMIN'],
  VIEW_AUDIT: ['ADMIN'],
  INGEST_METRICS: ['ADMIN'],
  RUN_SIMULATOR: ['ADMIN'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** Human label for a role, for badges and the user table. */
export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
};
