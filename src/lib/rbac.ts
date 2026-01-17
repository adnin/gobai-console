export type Role =
  | "merchant"
  | "admin"
  | "ops"
  | "fleet_admin"
  | "dispatcher"
  | "finance_lite"
  | "partner_ops"
  | "partner"
  | "driver"
  | "support"
  | "finance"
  | "system";

export type Viewer = {
  id: number;
  name: string;
  roles: Role[];
  tenantId?: number | null;
};

export function hasRole(viewer: Viewer | null | undefined, role: Role) {
  return !!viewer?.roles?.includes(role);
}

export function hasAnyRole(viewer: Viewer | null | undefined, roles: Role[]) {
  if (!viewer) return false;
  return roles.some((r) => viewer.roles.includes(r));
}

export function requireAnyRole(viewer: Viewer | null | undefined, roles: Role[]) {
  return hasAnyRole(viewer, roles);
}
