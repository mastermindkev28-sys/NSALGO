import type { Role } from "@/types/domain";

/** Role-based permissions for staff surfaces. Checked server-side on every admin page and action. */
export const PERMISSIONS = [
  "admin.view",
  "content.manage",
  "education.manage",
  "commentary.manage",
  "users.view",
  "users.manage",
  "billing.view",
  "atlas.configure",
  "providers.view",
  "system.view",
  "analytics.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  member: [],
  editor: ["admin.view", "content.manage", "education.manage", "commentary.manage"],
  analyst: ["admin.view", "atlas.configure", "providers.view", "system.view", "commentary.manage", "analytics.view"],
  admin: PERMISSIONS,
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function isStaff(role: Role | null | undefined): boolean {
  return !!role && role !== "member";
}
