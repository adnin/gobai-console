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

export type PartnerCreateOrderInput = {
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  dropoff_address: string;
  dropoff_latitude: number;
  dropoff_longitude: number;
  vehicle_type_id: number;
  distance?: number | null;
  total_driver_fare?: number | null;
  total_transaction_fare?: number | null;
  total_price?: number | null;
  payment_method?: "gcash_qr" | "cod" | "wallet" | null;
  payment_status?: string | null;
  trip_type?: "oneway" | "roundtrip" | null;
  flow_type?: "transport" | "parcel" | "store" | null;
  notes?: string | null;
};

export type PartnerDispatchOrder = {
  id: number;
  reference_no: string;
  status: string;
  dispatch_status: string;
  dispatch_at: string | null;
  pickup_address: string;
  dropoff_address: string;
  distance?: number | null;
  driver?: {
    id: number;
    name: string;
    mobile?: string | null;
    status?: string;
    latitude?: string | number | null;
    longitude?: string | number | null;
  } | null;
};

export async function partnerCreateOrder(
  token: string,
  input: PartnerCreateOrderInput
): Promise<{ data: PartnerDispatchOrder }> {
  return apiFetch(`/partner/orders`, {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export async function partnerOrder(token: string, orderId: number): Promise<{ data: PartnerDispatchOrder }> {
  return apiFetch(`/partner/orders/${orderId}`, { method: "GET", token });
}

export type PartnerTracking = {
  order_id: number;
  reference_no: string;
  status: string;
  dispatch_status: string;
  dispatch_at: string | null;
  driver: {
    id: number;
    name: string;
    mobile?: string | null;
    status: string;
    latitude?: string | null;
    longitude?: string | null;
  } | null;
  timestamps: {
    assigned_at: string | null;
    delivered_at: string | null;
    completed_at: string | null;
  };
};

export async function partnerTracking(token: string, orderId: number): Promise<{ data: PartnerTracking }> {
  return apiFetch(`/partner/orders/${orderId}/tracking`, { method: "GET", token });
}

export type PartnerPodCloseResponse = {
  ok: boolean;
  order: PartnerDispatchOrder;
};

export async function partnerPodClose(
  token: string,
  orderId: number,
  input: { latitude?: number | null; longitude?: number | null; pod_notes?: string | null }
): Promise<PartnerPodCloseResponse> {
  return apiFetch(`/partner/orders/${orderId}/pod-close`, {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export type PartnerUsageResponse = {
  window: {
    start: string;
    end: string;
    days: string;
  };
  usage: {
    jobs_total: number;
    jobs_completed: number;
    jobs_cancelled: number;
    active_drivers: number;
    seats_total: number;
  };
  billing: {
    currency: string;
    base_fee_points: number;
    per_job_points: number;
    per_active_driver_points: number;
    per_seat_points: number;
    line_items: {
      jobs: string;
      active_drivers: string;
      seats: string;
    };
    total_points: string;
  };
};

export async function partnerUsage(
  token: string,
  params?: { start?: string; end?: string; since_days?: number }
): Promise<PartnerUsageResponse> {
  return apiFetch(`/partner/usage${qs(params ?? {})}`, { method: "GET", token });
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
