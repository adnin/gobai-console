import { apiFetch } from "@/lib/http";
import type { ApiDeliveryOrder, ApiDriverProfile, Paginated } from "./opsApi";

function qs(params: Record<string, any>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function partnerListOrders(
  token: string,
  params?: { store_status?: string; dispatch_status?: string; page?: number; per_page?: number; today?: boolean }
): Promise<Paginated<ApiDeliveryOrder>> {
  return apiFetch<Paginated<ApiDeliveryOrder>>(
    `/partner/orders${qs({ per_page: 100, page: 1, ...params })}`,
    { method: "GET", token }
  );
}

export async function partnerListDrivers(
  token: string,
  params?: { q?: string; status?: string; page?: number; per_page?: number }
): Promise<Paginated<ApiDriverProfile>> {
  // Partner endpoint returns the same enriched DriverProfile shape as ops.
  return apiFetch<Paginated<ApiDriverProfile>>(
    `/partner/drivers${qs({ per_page: 100, page: 1, status: "approved", ...params })}`,
    { method: "GET", token }
  );
}

export async function partnerOfferDriver(
  token: string,
  input: { orderId: number; driverId: number }
): Promise<any> {
  return apiFetch(`/partner/orders/${input.orderId}/offer-driver`, {
    method: "POST",
    token,
    body: JSON.stringify({ driver_id: input.driverId }),
  });
}

export async function partnerAssignDriver(
  token: string,
  input: { orderId: number; driverId: number; note?: string }
): Promise<any> {
  return apiFetch(`/partner/orders/${input.orderId}/assign-driver`, {
    method: "POST",
    token,
    body: JSON.stringify({ driver_id: input.driverId, note: input.note ?? "" }),
  });
}

export async function partnerRedispatchOrder(token: string, input: { orderId: number; note?: string }) {
  return apiFetch(`/partner/orders/${input.orderId}/redispatch`, {
    method: "POST",
    token,
    body: JSON.stringify({ note: input.note ?? "" }),
  });
}

export type PartnerOverview = {
  drivers_total: number;
  drivers_online: number;
  orders_active: number;
  orders_searching: number;
  orders_assigned: number;
  completed_today: number;
  earnings_today_points: number;
  wallet_balance_points: number;
};

export async function partnerOverview(token: string): Promise<{ data: PartnerOverview }> {
  return apiFetch(`/partner/overview`, { method: "GET", token });
}

export type PartnerKpiToday = {
  date: string;
  orders_created: number;
  orders_completed: number;
  orders_cancelled: number;
  disputes_opened: number;
  drivers_online_avg: number;
  acceptance_rate: number;
  p50_assign_seconds: number;
  p90_assign_seconds: number;
};

export async function partnerKpiToday(token: string): Promise<{ data: PartnerKpiToday }> {
  return apiFetch(`/partner/kpi/today`, { method: "GET", token });
}
