import {
  ApiError,
  API_BASE_URL,
  apiFetch,
  emitGlobalApiError,
  getStoredTenantId,
} from "@/lib/http";

function qs(params: Record<string, any>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Admin — aligned to api.zip routes
 * - Merchants: /admin/merchants/*
 * - Drivers: /admin/driver-applications/* and /admin/driver-documents/*
 * - Wallet cash-in/out: /admin/wallet/cashin|cashout
 * - Receipts: /admin/receipts
 * - Order payment verify/reject: /admin/orders/{order}/payment/verify|reject
 */

// -------- Merchants --------
export async function adminMerchantsPending(
  token: string,
  params?: { per_page?: number; page?: number; q?: string; status?: "pending" | "approved" | "rejected" | "suspended" | "all" }
) {
  return apiFetch(`/admin/merchants/pending${qs(params ?? {})}`, { method: "GET", token });
}

export async function adminMerchantShow(token: string, merchantUserId: number) {
  return apiFetch(`/admin/merchants/${merchantUserId}`, { method: "GET", token });
}

export type AdminPlaceOption = {
  id: number;
  name?: string | null;
  landmark?: string | null;
  city?: string | null;
};

export async function adminListPlaces(token: string, params?: { search?: string }) {
  return apiFetch<AdminPlaceOption[]>(`/places${qs(params ?? {})}`, { method: "GET", token });
}

export type AdminFareVehicleType = {
  id: number;
  name: string;
  base_fare: number;
  per_km_rate: number;
  wait_rate_per_min: number;
  surcharge: number;
  transaction_fee: number;
  transaction_per_km_fee: number;
  included_km: number;
  tier1_km_cap: number;
  tier1_per_km_rate: number;
  tier2_per_km_rate: number;
  speed_economy_mult: number;
  speed_standard_mult: number;
  speed_express_mult: number;
  is_active: boolean;
};

export type AdminFareVehicleTypeListResponse = {
  data: AdminFareVehicleType[];
};

export type AdminFareVehicleTypeUpdatePayload = Partial<
  Pick<
    AdminFareVehicleType,
    | "base_fare"
    | "per_km_rate"
    | "wait_rate_per_min"
    | "surcharge"
    | "transaction_fee"
    | "transaction_per_km_fee"
    | "included_km"
    | "tier1_km_cap"
    | "tier1_per_km_rate"
    | "tier2_per_km_rate"
    | "speed_economy_mult"
    | "speed_standard_mult"
    | "speed_express_mult"
    | "is_active"
  >
>;

export type AdminFareVehicleTypeUpdateResponse = {
  message?: string;
  data: AdminFareVehicleType;
};

export type AdminFareEstimateResponse = {
  data: {
    vehicle_type: {
      id: number;
      name: string;
    };
    pickup: {
      id: number;
      name: string | null;
      latitude: number;
      longitude: number;
    };
    destination: {
      id: number;
      name: string | null;
      latitude: number;
      longitude: number;
    };
    route: {
      distance_km: number;
      duration_min: number;
    };
    rates: {
      base_fare_cents: number;
      per_km_rate_cents: number;
      per_min_rate_cents: number;
      surcharge_cents: number;
      transaction_fee_cents: number;
      transaction_per_km_fee_cents: number;
    };
    breakdown: {
      base_fare_cents: number;
      distance_charge_cents: number;
      time_charge_cents: number;
      surcharge_cents: number;
      transaction_fee_cents: number;
      transaction_distance_fee_cents: number;
      total_cents: number;
    };
    formula: string;
  };
};

export async function adminFareVehicleTypes(token: string) {
  return apiFetch<AdminFareVehicleTypeListResponse>(`/admin/fares/vehicle-types`, {
    method: "GET",
    token,
  });
}

export async function adminUpdateFareVehicleType(
  token: string,
  vehicleTypeId: number,
  payload: AdminFareVehicleTypeUpdatePayload
) {
  return apiFetch<AdminFareVehicleTypeUpdateResponse>(`/admin/fares/vehicle-types/${vehicleTypeId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export async function adminEstimateFare(
  token: string,
  payload: { vehicle_type_id: number; pickup_place_id: number; destination_place_id: number }
) {
  return apiFetch<AdminFareEstimateResponse>(`/admin/fares/estimate`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export type AdminStoreMetaTagsResponse = {
  message?: string;
  data: {
    store_id: number;
    meta: {
      tags?: string[];
    } | null;
  };
};

export type AdminStoreAssignmentResponse = {
  message?: string;
  data: {
    store_id: number;
    pickup_place_id: number | null;
    pickup_place_name: string | null;
    service_zone_id: number | null;
    service_zone_name: string | null;
  };
};

export async function adminUpdateStoreMetaTags(token: string, storeId: number, tags: string[]) {
  return apiFetch<AdminStoreMetaTagsResponse>(`/admin/stores/${storeId}/meta-tags`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ tags }),
  });
}

export async function adminUpdateStoreAssignment(
  token: string,
  storeId: number,
  payload: { pickup_place_id: number | null; service_zone_id: number | null }
) {
  return apiFetch<AdminStoreAssignmentResponse>(`/admin/stores/${storeId}/assignment`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export async function adminApproveMerchant(token: string, merchantUserId: number, storeId?: number) {
  return apiFetch(`/admin/merchants/${merchantUserId}/approve`, {
    method: "POST",
    token,
    body: JSON.stringify({ store_id: storeId ?? null }),
  });
}

export async function adminRejectMerchant(token: string, merchantUserId: number, reason: string) {
  return apiFetch(`/admin/merchants/${merchantUserId}/reject`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
}

export async function adminApproveMerchantDocument(token: string, documentId: number) {
  return apiFetch(`/admin/merchant-documents/${documentId}/approve`, { method: "POST", token });
}

export async function adminRejectMerchantDocument(token: string, documentId: number, reason: string) {
  return apiFetch(`/admin/merchant-documents/${documentId}/reject`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
}

// -------- Drivers --------
export type AdminDriverServiceKey = "transport" | "food" | "parcel";

export type AdminDriverServiceSettings = Record<AdminDriverServiceKey, boolean>;

export type AdminDriverServicePayload = {
  driver_id: number;
  profile_status: string;
  services: AdminDriverServiceSettings;
  enabled_order_flows: string[];
  updated_at: string | null;
};

export type AdminDriverServiceResponse = {
  message?: string;
  data: AdminDriverServicePayload;
};

export type AdminPlacesImportSummary = {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
};

export type AdminPlacesImportResponse = {
  message?: string;
  data: AdminPlacesImportSummary;
};

export async function adminDriverApplications(
  token: string,
  params?: { status?: "pending" | "approved" | "rejected"; page?: number; per_page?: number; q?: string }
) {
  return apiFetch(`/admin/driver-applications${qs(params ?? {})}`, { method: "GET", token });
}

export async function adminApproveDriverApplication(token: string, applicationId: number) {
  return apiFetch(`/admin/driver-applications/${applicationId}/approve`, { method: "POST", token });
}

export async function adminRejectDriverApplication(token: string, applicationId: number, reason: string) {
  return apiFetch(`/admin/driver-applications/${applicationId}/reject`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
}

export async function adminApproveDriverDocument(token: string, documentId: number) {
  return apiFetch(`/admin/driver-documents/${documentId}/approve`, { method: "POST", token });
}

export async function adminRejectDriverDocument(token: string, documentId: number, reason: string) {
  return apiFetch(`/admin/driver-documents/${documentId}/reject`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
}

export async function adminDriverServiceSettings(token: string, driverUserId: number) {
  return apiFetch<AdminDriverServiceResponse>(`/admin/drivers/${driverUserId}/services`, { method: "GET", token });
}

export async function adminUpdateDriverServiceSettings(
  token: string,
  driverUserId: number,
  services: Partial<AdminDriverServiceSettings>
) {
  return apiFetch<AdminDriverServiceResponse>(`/admin/drivers/${driverUserId}/services`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ services }),
  });
}

export async function adminImportPlacesJson(
  token: string,
  file: File
): Promise<AdminPlacesImportResponse> {
  const form = new FormData();
  form.set("file", file);

  const res = await fetch(`${API_BASE_URL}/admin/places/import`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(getStoredTenantId() ? { "X-Tenant-Id": String(getStoredTenantId()) } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    const ct = res.headers.get("content-type") ?? "";
    let payload: any = null;
    try {
      payload = ct.includes("application/json") ? await res.json() : await res.text();
    } catch {
      payload = null;
    }

    const msg =
      (payload && typeof payload === "object" && payload.message) ||
      (typeof payload === "string" && payload) ||
      `Request failed (${res.status})`;
    const err = new ApiError(String(msg), res.status, payload);
    emitGlobalApiError(err);
    throw err;
  }

  return (await res.json()) as AdminPlacesImportResponse;
}

// -------- Wallet cash-in / cash-out --------
export async function adminCashins(
  token: string,
  params?: { status?: "submitted" | "approved" | "rejected"; page?: number; per_page?: number }
) {
  return apiFetch(`/admin/wallet/cashin${qs(params ?? {})}`, { method: "GET", token });
}

export async function adminCashinsApprove(token: string, cashinId: number) {
  return apiFetch(`/admin/wallet/cashin/${cashinId}/approve`, { method: "POST", token });
}

export async function adminCashinsReject(token: string, cashinId: number, reason: string) {
  return apiFetch(`/admin/wallet/cashin/${cashinId}/reject`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
}

export async function adminCashouts(
  token: string,
  params?: { status?: "hold" | "approved" | "rejected"; page?: number; per_page?: number }
) {
  return apiFetch(`/admin/wallet/cashout${qs(params ?? {})}`, { method: "GET", token });
}

export async function adminCashoutsApprove(token: string, cashoutId: number) {
  return apiFetch(`/admin/wallet/cashout/${cashoutId}/approve`, { method: "POST", token });
}

export async function adminCashoutsReject(token: string, cashoutId: number, reason: string) {
  return apiFetch(`/admin/wallet/cashout/${cashoutId}/reject`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
}

// -------- Receipts --------
export async function adminReceiptStats(token: string) {
  return apiFetch(`/admin/receipts/stats`, { method: "GET", token });
}

export async function adminReceipts(
  token: string,
  params?: { status?: "pending" | "approved" | "rejected"; page?: number; per_page?: number }
) {
  return apiFetch(`/admin/receipts${qs(params ?? {})}`, { method: "GET", token });
}

export async function adminReceiptShow(token: string, receiptId: number) {
  return apiFetch(`/admin/receipts/${receiptId}`, { method: "GET", token });
}

export async function adminReceiptsApprove(token: string, receiptId: number) {
  return apiFetch(`/admin/receipts/${receiptId}/approve`, { method: "POST", token });
}

export async function adminReceiptsReject(token: string, receiptId: number, reason: string) {
  return apiFetch(`/admin/receipts/${receiptId}/reject`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
}

// -------- Order payment (GCash QR) --------
export async function adminVerifyOrderPayment(token: string, orderId: number) {
  return apiFetch(`/admin/orders/${orderId}/payment/verify`, { method: "POST", token });
}

export async function adminRejectOrderPayment(token: string, orderId: number, reason: string) {
  return apiFetch(`/admin/orders/${orderId}/payment/reject`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
}
