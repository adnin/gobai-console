import { apiFetch, envStr, API_BASE_URL, ApiError, emitGlobalApiError } from "@/lib/http";

export type MerchantOrderLite = {
  id: number;
  reference_no?: string;
  flow_type?: string;
  status?: string;
  store_status?: string; // new | accepted | preparing | ready
  prep_status?: string | null;

  payment_method?: string;
  payment_status?: string;
  payment_expires_at?: string | null;

  // Paper/pharmacy fields (may appear in list JSON depending on API serialization)
  request_kind?: string;
  requires_quote_confirmation?: boolean;
  quote_status?: string;
  request_attachments?: any[];

  // Timing
  created_at?: string;
  updated_at?: string;
  order_time?: string;
  store_accepted_at?: string | null;
  store_ready_at?: string | null;
  prep_time_min?: number | null;
};

export type MerchantOrdersResponse = {
  data: MerchantOrderLite[];
  meta?: {
    current_page?: number;
    per_page?: number;
    total?: number;
    last_page?: number;
  };
};

export type MerchantAttachment = {
  id?: any;
  name?: string;
  mime?: string | null;
  url?: string | null;
  thumb_url?: string | null;
};

export type MerchantQuoteItem = {
  name: string;
  qty: number;
  unit_price: number;
  notes?: string;
};

export type MerchantOrderDetails = MerchantOrderLite & {
  patient_name?: string;
  patient_birthdate?: string;
  request_notes?: string | null;
  quote_payload?: any;
  totals?: any;
  items?: any[];
  request_attachments?: Array<string | MerchantAttachment>;
  payment_reference?: string;
};

export type MerchantPaperQuotePayload = {
  currency?: string;
  items: Array<{ name: string; qty: number; unit_price: number; notes?: string }>;
  pharmacist_notes?: string;
  allow_partial_fill?: boolean;
  partial_fill_notes?: string;
};

function p(key: string, fallback: string) {
  return envStr(key, fallback);
}

export function merchantOrdersPath() {
  return p("VITE_MERCHANT_ORDERS_PATH", "/merchant/orders");
}

export function merchantOrderAcceptPath(id: number) {
  const tpl = p("VITE_MERCHANT_ORDER_ACCEPT_PATH", "/merchant/orders/{id}/accept");
  return tpl.replace("{id}", String(id));
}

export function merchantOrderPickupCompletePath(id: number) {
  const tpl = p(
    "VITE_MERCHANT_ORDER_PICKUP_COMPLETE_PATH",
    "/merchant/orders/{id}/pickup/complete"
  );
  return tpl.replace("{id}", String(id));
}

export async function merchantCompletePickup(token: string | null, id: number) {
  return apiFetch<any>(merchantOrderPickupCompletePath(id), {
    method: "POST",
    token,
  });
}


export function merchantOrderStatusPath(id: number) {
  const tpl = p("VITE_MERCHANT_ORDER_STATUS_PATH", "/merchant/orders/{id}/status");
  return tpl.replace("{id}", String(id));
}

export function merchantOrderShowPath(id: number) {
  const tpl = p("VITE_MERCHANT_ORDER_SHOW_PATH", "/merchant/orders/{id}");
  return tpl.replace("{id}", String(id));
}

export function merchantOrderPaperQuotePath(id: number) {
  const tpl = p("VITE_MERCHANT_ORDER_PAPER_QUOTE_PATH", "/merchant/orders/{id}/paper/quote");
  return tpl.replace("{id}", String(id));
}

export function merchantPickupCompletePath(id: number) {
  const tpl = p(
    "VITE_MERCHANT_ORDER_PICKUP_COMPLETE_PATH",
    "/merchant/orders/{id}/pickup/complete"
  );
  return tpl.replace("{id}", String(id));
}

/**
 * ✅ Helps the UI show meaningful errors:
 * Laravel 422 payload often looks like:
 * { message: "The given data was invalid.", errors: { field: ["msg"] } }
 */
function extractApiErrorMessage(e: any): string {
  const data = e?.data ?? e?.response?.data ?? null;
  if (data?.errors && typeof data.errors === "object") {
    const firstKey = Object.keys(data.errors)[0];
    const arr = firstKey ? data.errors[firstKey] : null;
    if (Array.isArray(arr) && arr[0]) return String(arr[0]);
  }
  if (data?.message) return String(data.message);
  if (e?.message) return String(e.message);
  return "Request failed";
}

/**
 * ✅ apiFetch wrapper that forces JSON headers.
 * If your apiFetch already adds these, it’s still safe.
 */
async function apiJson<T>(
  path: string,
  opts: {
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    token: string | null;
    body?: any;
    /** Optional extra headers (e.g. Idempotency-Key). */
    headers?: Record<string, string>;
  }
): Promise<T> {
  try {
    return await apiFetch<T>(path, {
      method: opts.method,
      token: opts.token,
      body: opts.body,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(opts.headers ?? {}),
      } as any,
    } as any);
  } catch (e: any) {
    // Re-throw with a clean message so your toasts are useful
    const msg = extractApiErrorMessage(e);
    const err = new Error(msg);
    (err as any).raw = e;
    throw err;
  }
}

export async function merchantListOrders(
  token: string | null,
  limit = 50
): Promise<MerchantOrdersResponse> {
  const qs = new URLSearchParams({ limit: String(limit) });
  return apiJson<MerchantOrdersResponse>(`${merchantOrdersPath()}?${qs.toString()}`, {
    method: "GET",
    token,
  });
}

export async function merchantAcceptOrder(
  token: string | null,
  id: number,
  prep_time_min?: number
) {
  const body: any = {};
  if (typeof prep_time_min === "number") body.prep_time_min = prep_time_min;

  return apiJson<any>(merchantOrderAcceptPath(id), {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

// Order lane status update ("new" → "accepted" → "preparing" → "ready")
export async function merchantUpdateOrderStoreStatus(
  token: string | null,
  id: number,
  store_status: "accepted" | "preparing" | "ready",
  prep_minutes?: number
) {
  const body: any = { store_status };
  if (typeof prep_minutes === "number") body.prep_minutes = prep_minutes;

  return apiJson<any>(merchantOrderStatusPath(id), {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function merchantGetOrder(
  token: string | null,
  id: number
): Promise<MerchantOrderDetails> {
  return apiJson<MerchantOrderDetails>(merchantOrderShowPath(id), {
    method: "GET",
    token,
  });
}

export async function merchantSubmitPaperQuote(
  token: string | null,
  id: number,
  payload: MerchantPaperQuotePayload
) {
  return apiJson<any>(merchantOrderPaperQuotePath(id), {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

/**
 * ✅ Optional: supports your new pickup completion endpoint
 * POST /merchant/orders/{order}/pickup/complete
 */
export async function merchantPickupComplete(token: string | null, id: number) {
  return apiJson<any>(merchantPickupCompletePath(id), {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
}

// --- KPI / Subscription ---
export type MerchantKpiResponse = {
  today: {
    date: string;
    orders_sold: number;
    transactions_count: number;
    gross_sales: number;
    net_sales_ex_platform_fee: number;
  };
  all_time: {
    orders_sold: number;
    gross_sales: number;
    net_sales_ex_platform_fee: number;
  };
};

export async function merchantGetKpi(token: string | null, date?: string): Promise<MerchantKpiResponse> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiJson<MerchantKpiResponse>(`/merchant/kpi${qs}`, {
    method: "GET",
    token,
  });
}

export type MerchantSubscriptionResponse = {
  base_limit: number;
  extra_slots: number;
  monthly_credits_per_extra_slot: number;
  active_until: string | null;
  allowed_products: number;
};

export async function merchantGetSubscription(token: string | null): Promise<MerchantSubscriptionResponse> {
  return apiJson<MerchantSubscriptionResponse>(`/merchant/subscription`, {
    method: "GET",
    token,
  });
}

// ✅ Back-compat name used by some screens
export async function merchantSubscription(
  token: string | null
): Promise<MerchantSubscriptionResponse> {
  return merchantGetSubscription(token);
}

export async function merchantUpgradeSubscription(
  token: string | null,
  payload: { extra_slots: number; months?: number }
) {
  return apiJson<any>(`/merchant/subscription/upgrade`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

// --------------------
// Store + Products + Wallet (Merchant OS v1)

export type MerchantStore = {
  id: number;
  name: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pickup_place_id?: number | null;
  status?: string;
  approval_status?: string;
  open_time?: string | null;
  close_time?: string | null;
  product_limit_base?: number | null;
  product_limit_extra?: number | null;
  subscription_ends_at?: string | null;
  default_prep_time_min?: number | null;
  prep_time_minutes?: number | null;
  order_cutoff_minutes?: number | null;
  is_paused?: boolean;
  pause_reason?: string | null;
  pause_notes?: string | null;
  pause_started_at?: string | null;
  pause_expires_at?: string | null;
  availability?: string;
};

export async function merchantGetStore(token: string): Promise<{ store: MerchantStore }> {
  return apiJson(`/merchant/store`, { method: "GET", token });
}

// ✅ Back-compat helper (some pages expect the store object directly)
export async function merchantStore(token: string): Promise<MerchantStore> {
  const res = await merchantGetStore(token);
  return (res as any)?.store ?? (res as any);
}

export async function merchantUpdateStore(token: string, patch: Partial<MerchantStore>): Promise<{ store: MerchantStore }> {
  return apiJson(`/merchant/store`, { method: "PATCH", token, body: JSON.stringify(patch) });
}

export async function merchantUpdateStoreStatus(token: string, status: "open" | "closed" | "paused"): Promise<any> {
  return apiJson(`/merchant/store/status`, { method: "PATCH", token, body: JSON.stringify({ status }) });
}

export async function merchantSetStoreHours(token: string, hours: { open_time: string; close_time: string }): Promise<any> {
  return apiJson(`/merchant/store/hours`, { method: "PATCH", token, body: JSON.stringify(hours) });
}

// ✅ Back-compat name used by some screens
export async function merchantUpdateStoreHours(
  token: string,
  hours: { open_time: string | null; close_time: string | null }
): Promise<any> {
  // API expects strings; null is allowed for clearing.
  return merchantSetStoreHours(token, { open_time: hours.open_time as any, close_time: hours.close_time as any });
}

export async function merchantPauseStore(
  token: string,
  payload: { reason: string; notes?: string | null; resume_after_minutes?: number | null; resume_at?: string | null }
): Promise<any> {
  return apiJson(`/merchant/store/pause`, { method: "POST", token, body: JSON.stringify(payload) });
}

export async function merchantResumeStore(token: string): Promise<any> {
  return apiJson(`/merchant/store/resume`, { method: "POST", token, body: JSON.stringify({}) });
}

export async function merchantUpdateDefaultPrepTime(token: string, default_prep_time_min: number): Promise<any> {
  return apiJson(`/merchant/store/prep-time`, { method: "PATCH", token, body: JSON.stringify({ default_prep_time_min }) });
}

export type MerchantProduct = {
  id: number;
  store_id: number;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  image?: string | null;
  is_available: number | boolean;
  created_at?: string;
  updated_at?: string;
};

export async function merchantListProducts(token: string): Promise<any> {
  return apiJson(`/merchant/products`, { method: "GET", token });
}

export async function merchantCreateProduct(token: string, input: {
  name: string;
  description?: string;
  price: number;
  stock: number;
  is_available?: boolean;
  image_file?: File | null;
  image_url?: string | null;
}): Promise<MerchantProduct> {
  const form = new FormData();
  form.set("name", input.name);
  if (input.description !== undefined) form.set("description", input.description);
  form.set("price", String(input.price));
  form.set("stock", String(input.stock));
  if (input.is_available !== undefined) form.set("is_available", String(input.is_available ? 1 : 0));
  if (input.image_file) form.set("image", input.image_file);
  if (input.image_url) form.set("image_url", input.image_url);

  // Note: apiJson sets JSON headers; we need raw fetch here.
  const resp = await fetch(`${API_BASE_URL}/merchant/products`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  if (!resp.ok) {
    const ct = resp.headers.get("content-type") ?? "";
    let payload: any = null;
    try {
      payload = ct.includes("application/json") ? await resp.json() : await resp.text();
    } catch {
      payload = null;
    }
    const msg =
      (payload && typeof payload === "object" && payload.message) ||
      (typeof payload === "string" && payload) ||
      `Request failed (${resp.status})`;
    const err = new ApiError(String(msg), resp.status, payload);
    emitGlobalApiError(err);
    throw err;
  }
  return resp.json();
}

export async function merchantUpdateProduct(token: string, productId: number, input: {
  name?: string;
  description?: string | null;
  price?: number;
  stock?: number;
  is_available?: boolean;
  image_file?: File | null;
  image_url?: string | null;
  remove_image?: boolean;
}): Promise<MerchantProduct> {
  const form = new FormData();
  if (input.name !== undefined) form.set("name", input.name);
  if (input.description !== undefined) form.set("description", input.description ?? "");
  if (input.price !== undefined) form.set("price", String(input.price));
  if (input.stock !== undefined) form.set("stock", String(input.stock));
  if (input.is_available !== undefined) form.set("is_available", String(input.is_available ? 1 : 0));
  if (input.remove_image) form.set("remove_image", "1");
  if (input.image_file) form.set("image", input.image_file);
  if (input.image_url !== undefined) form.set("image_url", input.image_url ?? "");

  const resp = await fetch(`${API_BASE_URL}/merchant/products/${productId}`, {
    method: "POST", // Laravel accepts PUT/PATCH but multipart is easier via POST with _method
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: (() => {
      form.set("_method", "PUT");
      return form;
    })(),
  });
  if (!resp.ok) {
    const ct = resp.headers.get("content-type") ?? "";
    let payload: any = null;
    try {
      payload = ct.includes("application/json") ? await resp.json() : await resp.text();
    } catch {
      payload = null;
    }
    const msg =
      (payload && typeof payload === "object" && payload.message) ||
      (typeof payload === "string" && payload) ||
      `Request failed (${resp.status})`;
    const err = new ApiError(String(msg), resp.status, payload);
    emitGlobalApiError(err);
    throw err;
  }
  return resp.json();
}

export async function merchantDeleteProduct(token: string, productId: number): Promise<any> {
  return apiJson(`/merchant/products/${productId}`, { method: "DELETE", token });
}

export async function merchantUpdateProductAvailability(token: string, productId: number, isAvailable: boolean): Promise<MerchantProduct> {
  return apiJson(`/merchant/products/${productId}/availability`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ is_available: isAvailable }),
  });
}

export type MerchantWallet = {
  user_id: number;
  balance_points: number;
  available_points: number;
  held_points: number;
  status: string;
};

export async function merchantWallet(token: string): Promise<MerchantWallet> {
  return apiJson(`/merchant/wallet`, { method: "GET", token });
}

export async function merchantWalletLedger(token: string): Promise<any> {
  return apiJson(`/merchant/wallet/transactions`, { method: "GET", token });
}

export async function merchantPayouts(token: string, params?: { per_page?: number }): Promise<any> {
  const sp = new URLSearchParams();
  if (params?.per_page) sp.set("per_page", String(params.per_page));
  const q = sp.toString();
  return apiJson(`/merchant/payouts${q ? `?${q}` : ""}`, { method: "GET", token });
}

export async function merchantRequestPayout(token: string, payload: {
  amount: number;
  payout_method: "gcash" | "bank";
  payout_account: string;
  payout_name?: string | null;
  idempotency_key?: string;
}): Promise<any> {
  const headers: Record<string, string> = {};
  if (payload.idempotency_key) headers["Idempotency-Key"] = payload.idempotency_key;
  return apiJson(`/merchant/payouts/request`, {
    method: "POST",
    token,
    headers,
    body: JSON.stringify({
      amount: payload.amount,
      payout_method: payload.payout_method,
      payout_account: payload.payout_account,
      payout_name: payload.payout_name ?? null,
    }),
  });
}

export async function merchantAuditLogs(token: string, params?: { per_page?: number; page?: number }): Promise<any> {
  const sp = new URLSearchParams();
  if (params?.per_page) sp.set("per_page", String(params.per_page));
  if (params?.page) sp.set("page", String(params.page));
  const q = sp.toString();
  return apiJson(`/merchant/audit${q ? `?${q}` : ""}`, { method: "GET", token });
}
