import { apiFetch } from "@/lib/http";
import type { Paginated } from "@/features/dispatch/api/opsApi";

function qs(params: Record<string, any>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export type AdminUserRolePayload = {
  add_roles?: string[];
  remove_roles?: string[];
};

export async function adminSearchUsers(
  token: string,
  params?: { q?: string; role?: string; page?: number; per_page?: number }
): Promise<Paginated<any>> {
  return apiFetch(`/admin/users/search${qs({ per_page: 25, page: 1, ...params })}`, {
    method: "GET",
    token,
  });
}

export async function adminUpdateUserRoles(
  token: string,
  userId: number,
  payload: AdminUserRolePayload
): Promise<{ ok?: boolean }> {
  return apiFetch(`/admin/users/${userId}/roles`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}
