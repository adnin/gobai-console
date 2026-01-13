import { apiFetch } from "@/lib/http";
import type {
  AdminOrderFilters,
  AdminOrderResponse,
  AdminOrdersResponse,
  AdminReassignDriverPayload,
  AdminUnassignDriverPayload,
  OrderTimelineResponse,
} from "./types";

function buildQuery(filters: AdminOrderFilters) {
  const search = new URLSearchParams();
  const set = (key: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return;
    search.set(key, String(value));
  };

  set("order_id", filters.order_id);
  set("customer_phone", filters.customer_phone?.trim());
  set("customer_email", filters.customer_email?.trim());
  set("driver_id", filters.driver_id);
  set("store_id", filters.store_id);
  set("status", filters.status);
  set("per_page", filters.per_page ?? 20);
  set("page", filters.page ?? 1);

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchAdminOrders(token: string, filters: AdminOrderFilters): Promise<AdminOrdersResponse> {
  const res = await apiFetch<AdminOrdersResponse>(`/admin/orders/search${buildQuery(filters)}` as const, {
    method: "GET",
    token,
  });
  return res;
}

export async function fetchAdminOrderTimeline(token: string, orderId: number | string): Promise<OrderTimelineResponse> {
  const res = await apiFetch<OrderTimelineResponse>(`/admin/orders/${orderId}/timeline`, {
    method: "GET",
    token,
  });
  return res;
}

export async function forceCancelAdminOrder(token: string, orderId: number | string, reason: string): Promise<AdminOrderResponse> {
  const res = await apiFetch<AdminOrderResponse>(`/admin/orders/${orderId}/force-cancel`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
  return res;
}

export async function reassignAdminOrder(
  token: string,
  orderId: number | string,
  payload: AdminReassignDriverPayload
): Promise<AdminOrderResponse> {
  const res = await apiFetch<AdminOrderResponse>(`/admin/orders/${orderId}/reassign-driver`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
  return res;
}

export async function unassignAdminOrder(
  token: string,
  orderId: number | string,
  payload: AdminUnassignDriverPayload
): Promise<AdminOrderResponse> {
  const res = await apiFetch<AdminOrderResponse>(`/admin/orders/${orderId}/unassign-driver`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
  return res;
}
