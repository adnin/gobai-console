import { apiFetch } from "@/lib/http";
import type { Paginated } from "@/features/dispatch/api/opsApi";

export type PartnerApplicationRow = {
  id: number;
  user_id: number;
  status: string;
  business_name?: string | null;
  facebook_page_url?: string | null;
  service_area?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
  user?: {
    id: number;
    name?: string | null;
    email?: string | null;
    mobile?: string | null;
    role_id?: number | null;
    role?: { id: number; name: string } | null;
  } | null;
};

function qs(params: Record<string, any>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function adminListPartnerApplications(
  token: string,
  params?: { status?: "pending" | "approved" | "rejected"; page?: number; limit?: number }
): Promise<Paginated<PartnerApplicationRow>> {
  return apiFetch<Paginated<PartnerApplicationRow>>(
    `/admin/partner-applications${qs({ page: params?.page ?? 1, limit: params?.limit ?? 20, status: params?.status ?? "pending" })}`,
    { method: "GET", token }
  );
}

export async function adminApprovePartnerApplication(token: string, profileId: number): Promise<any> {
  return apiFetch(`/admin/partner-applications/${profileId}/approve`, { method: "POST", token });
}

export async function adminRejectPartnerApplication(token: string, profileId: number, reason?: string): Promise<any> {
  return apiFetch(`/admin/partner-applications/${profileId}/reject`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason: reason ?? "" }),
  });
}

export async function adminAssignDriverToPartner(token: string, partnerUserId: number, driverUserId: number): Promise<any> {
  return apiFetch(`/admin/partners/${partnerUserId}/drivers/${driverUserId}/assign`, { method: "POST", token });
}

export async function adminUnassignDriver(token: string, driverUserId: number): Promise<any> {
  return apiFetch(`/admin/partners/drivers/${driverUserId}/unassign`, { method: "POST", token });
}

export async function adminAssignStoreToPartner(token: string, partnerUserId: number, storeId: number): Promise<any> {
  return apiFetch(`/admin/partners/${partnerUserId}/stores/${storeId}/assign`, { method: "POST", token });
}

export async function adminUnassignStore(token: string, storeId: number): Promise<any> {
  return apiFetch(`/admin/partners/stores/${storeId}/unassign`, { method: "POST", token });
}

export type StoreRow = {
  id: number;
  name?: string | null;
  address?: string | null;
  approval_status?: string | null;
  pickup_place_id?: string | null;
};

export async function listStores(token: string): Promise<StoreRow[]> {
  return apiFetch<StoreRow[]>(`/stores`, { method: "GET", token });
}

// --- Partner detail (admin view) ---
export type PartnerSummary = {
  partner_user_id: number;
  today: { completed: number; earnings_points: number };
  month: {
    completed: number;
    current_partner_pct: number;
    current_system_pct: number;
    next_order_partner_pct: number;
    next_order_system_pct: number;
    tier_label: string;
  };
  tiers: Array<{ max_orders?: number | null; partner_pct: number; system_pct: number }>;
};

export type PartnerWallet = {
  user_id: number;
  balance_points: number;
  status: string;
  updated_at?: string | null;
};

export type PartnerWalletTx = {
  id: number;
  wallet_id: number;
  type: string;
  points: number;
  reference_id?: number | null;
  reference_type?: string | null;
  meta?: any;
  created_at?: string | null;
};

export type PartnerDriverRow = {
  id: number;
  name?: string | null;
  email?: string | null;
  mobile?: string | null;
  partner_user_id?: number | null;
  last_seen_at?: string | null;
};

export type PartnerStoreRow = {
  id: number;
  name?: string | null;
  address?: string | null;
  approval_status?: string | null;
  partner_user_id?: number | null;
};

export async function adminGetPartnerSummary(token: string, partnerUserId: number): Promise<{ data: PartnerSummary }> {
  return apiFetch(`/admin/partners/${partnerUserId}/summary`, { method: "GET", token });
}

export async function adminGetPartnerWallet(token: string, partnerUserId: number): Promise<{ data: PartnerWallet }> {
  return apiFetch(`/admin/partners/${partnerUserId}/wallet`, { method: "GET", token });
}

export async function adminListPartnerWalletTransactions(
  token: string,
  partnerUserId: number,
  params?: { page?: number; per_page?: number }
): Promise<Paginated<PartnerWalletTx>> {
  return apiFetch(`/admin/partners/${partnerUserId}/wallet/transactions${qs({ page: params?.page ?? 1, per_page: params?.per_page ?? 25 })}`,
    { method: "GET", token });
}

export async function adminListPartnerDrivers(token: string, partnerUserId: number): Promise<{ data: PartnerDriverRow[] }> {
  return apiFetch(`/admin/partners/${partnerUserId}/drivers`, { method: "GET", token });
}

export async function adminListPartnerStores(token: string, partnerUserId: number): Promise<{ data: PartnerStoreRow[] }> {
  return apiFetch(`/admin/partners/${partnerUserId}/stores`, { method: "GET", token });
}
