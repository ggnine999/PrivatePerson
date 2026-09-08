export const COMMUNITY_PERMISSION = 0 as const;
export const ADMIN_PERMISSION = 1 as const;

export type AccountPermission =
  | typeof COMMUNITY_PERMISSION
  | typeof ADMIN_PERMISSION;

export function isAdminPermission(value: unknown): value is typeof ADMIN_PERMISSION {
  return value === ADMIN_PERMISSION;
}
