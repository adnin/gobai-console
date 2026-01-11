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

// ---- Overview ----
export type SupportOverviewResponse = {
  ok: boolean;
  time?: string;
};

export async function supportOverview(token: string): Promise<SupportOverviewResponse> {
  return apiFetch<SupportOverviewResponse>(`/support/overview`, { method: "GET", token });
}

// ---- Disputes (Trust Layer v1) ----
export type SupportDisputeRow = {
  id: number;
  delivery_order_id: number;
  status: string;
  reason_code: string;
  opened_at?: string | null;
  resolved_at?: string | null;
  evidence_count?: number;
};

export type SupportDisputeEvidence = {
  id: number;
  kind: string;
  note?: string;
  file_mime?: string;
  file_size?: number;
  file_url?: string | null;
  meta?: any;
  created_at?: string | null;
};

export type SupportDisputeDetail = {
  id: number;
  delivery_order_id: number;
  status: string;
  reason_code: string;
  description?: string;
  message?: string;
  opened_at?: string | null;
  resolved_at?: string | null;
  resolved_by_user_id?: number;
  resolution_kind?: string;
  resolution_meta?: any;
  order?: {
    id: number;
    status?: string;
    customer_id?: number;
    driver_id?: number;
    store_id?: number;
  } | null;
  evidence?: SupportDisputeEvidence[];
};

export async function supportListDisputes(
  token: string,
  params?: { status?: string; order_id?: number; customer_id?: number; limit?: number; page?: number }
): Promise<Paginated<SupportDisputeRow>> {
  return apiFetch<Paginated<SupportDisputeRow>>(
    `/support/disputes${qs({ limit: 20, page: 1, ...params })}`,
    { method: "GET", token }
  );
}

export async function supportGetDispute(token: string, id: number): Promise<{ dispute: SupportDisputeDetail }> {
  return apiFetch(`/support/disputes/${id}`, { method: "GET", token });
}

export type SupportResolveDisputePayload = {
  outcome: "refund" | "reject" | "penalty_driver" | "penalty_merchant";
  note?: string;
  refund_points?: number;
  penalty_driver_points?: number;
  penalty_merchant_points?: number;
  meta?: Record<string, any>;
};

export async function supportResolveDispute(token: string, id: number, payload: SupportResolveDisputePayload): Promise<any> {
  return apiFetch(`/support/disputes/${id}/resolve`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

// ---- Orders (Support read) ----
export async function supportListOrders(
  token: string,
  params?: { status?: string; q?: string; store_id?: number; driver_id?: number; customer_id?: number; page?: number; per_page?: number }
): Promise<Paginated<any>> {
  return apiFetch(`/support/orders${qs({ per_page: 20, page: 1, ...params })}`, { method: "GET", token });
}

export async function supportNoteOrder(token: string, orderId: number, note: string): Promise<{ ok: boolean }>{
  return apiFetch(`/support/orders/${orderId}/note`, {
    method: "POST",
    token,
    body: JSON.stringify({ note }),
  });
}

// Generic order detail (works for support without relying on missing controller methods)
export async function getDeliveryOrder(token: string, orderId: number): Promise<any> {
  return apiFetch(`/delivery-orders/${orderId}`, { method: "GET", token });
}

// ---- Users ----
export async function supportSearchUsers(
  token: string,
  params?: { q?: string; role?: string; page?: number; per_page?: number }
): Promise<Paginated<any>> {
  return apiFetch(`/support/users/search${qs({ per_page: 20, page: 1, ...params })}`, { method: "GET", token });
}

export async function supportGetUser(token: string, userId: number): Promise<{ user: any; recent_orders: any[] }>{
  return apiFetch(`/support/users/${userId}`, { method: "GET", token });
}
