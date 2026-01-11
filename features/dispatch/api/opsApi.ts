import { apiFetch } from "@/lib/http";

/** Raw API response shape from your backend */
export type Paginated<T> = {
  data: T[];
  meta?: {
    page?: number;
    current_page?: number;
    per_page?: number;
    total?: number;
    last_page?: number;
  };
};

export type ApiUser = {
  // Optional trust metrics (if provided by backend)
  score?: number | null;
  avg_response_ms?: number | null;
  avg_ack_ms?: number | null;
  miss_streak?: number | null;
  timeout_strikes?: number | null;
  idle_flags?: number | null;
  shadowbanned_until?: string | null;
  last_timeout_at?: string | null;
  last_event_at?: string | null;

  id: number;
  name?: string;
  email?: string;
  mobile?: string | null;
  status?: string | null; // available|busy|away|offline|...
  last_seen_at?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

export type ApiDeliveryOrder = {
  id: number;
  reference_no?: string | null;
  flow_type?: string | null; // store|transport|parcel|...
  status?: string | null; // pending|accepted|...
  dispatch_status?: string | null; // none|searching|assigned|...
  dispatch_at?: string | null;
  assigned_at?: string | null;

  pickup_address?: string | null;
  pickup_latitude?: number | string | null;
  pickup_longitude?: number | string | null;

  dropoff_address?: string | null;
  dropoff_latitude?: number | string | null;
  dropoff_longitude?: number | string | null;

  issue_detected?: boolean | number | null;

  driver_id?: number | null;
  driver?: ApiUser | null;

  created_at?: string | null;
  updated_at?: string | null;
};

export type ApiDriverProfile = {
  id: number;
  user_id: number;
  status?: string | null; // pending|approved|...
  user?: ApiUser | null;
  // Optional enrichments from Ops API
  trust?: Record<string, any> | null;
  stats?: { accepted_today?: number; completed_today?: number } | null;
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

export async function opsListOrders(
  token: string,
  params?: { status?: string; q?: string; page?: number; per_page?: number; store_id?: number; driver_id?: number }
): Promise<Paginated<ApiDeliveryOrder>> {
  return apiFetch<Paginated<ApiDeliveryOrder>>(`/ops/orders${qs({ per_page: 100, page: 1, ...params })}`, {
    method: "GET",
    token
  });
}

export async function opsListDrivers(
  token: string,
  params?: { q?: string; status?: string; page?: number; per_page?: number }
): Promise<Paginated<ApiDriverProfile>> {
  // status here refers to driver profile approval: pending|approved|...
  return apiFetch<Paginated<ApiDriverProfile>>(`/ops/drivers${qs({ per_page: 100, page: 1, status: "approved", ...params })}`, {
    method: "GET",
    token
  });
}

export type ApiOfferAttempt = {
  id?: number | string;
  order_id?: number;
  driver_id?: number;
  status?: string;
  offered_at?: string | null;
  expires_at?: string | null;
};

export async function opsAssignDriver(
  token: string,
  input: { orderId: number; driverId: number; note?: string }
): Promise<{ ok: boolean; order: { id: number; driver_id: number } }> {
  return apiFetch(`/ops/orders/${input.orderId}/assign-driver`, {
    method: "POST",
    token,
    body: JSON.stringify({ driver_id: input.driverId, note: input.note ?? "" })
  });
}


export async function opsOfferDriver(
  token: string,
  input: { orderId: number; driverId: number; note?: string }
): Promise<
  | { ok: boolean; attempt: ApiOfferAttempt }
  | { ok: boolean; order: { id: number; driver_id: number } }
  | any
> {
  // Default points to existing route, but you can set a dedicated "manual offer" endpoint later.
  const tpl = String((import.meta as any).env?.VITE_OPS_OFFER_DRIVER_PATH_TEMPLATE ?? "").trim();
  const path = (tpl || "/ops/orders/{orderId}/offer-driver").replace("{orderId}", String(input.orderId));

  return apiFetch(path, {
    method: "POST",
    token,
    body: JSON.stringify({ driver_id: input.driverId, note: input.note ?? "" }),
  });
}

export async function opsRedispatchOrder(token: string, input: { orderId: number; note?: string }) {
  const tpl = String((import.meta as any).env?.VITE_OPS_REDISPATCH_PATH_TEMPLATE ?? "").trim();
  const path = (tpl || "/ops/orders/{orderId}/redispatch").replace("{orderId}", String(input.orderId));

  return apiFetch(path, {
    method: "POST",
    token,
    body: JSON.stringify({ note: input.note ?? "" }),
  });
}

export async function opsReassignOrder(token: string, input: { orderId: number; note?: string }) {
  return apiFetch(`/ops/orders/${input.orderId}/reassign`, {
    method: "POST",
    token,
    body: JSON.stringify({ note: input.note ?? "" }),
  });
}

export async function opsCancelOrder(token: string, input: { orderId: number; reason?: string, note?: string }) {
  return apiFetch(`/ops/orders/${input.orderId}/cancel`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason: input.reason ?? "" }),
  });
}

