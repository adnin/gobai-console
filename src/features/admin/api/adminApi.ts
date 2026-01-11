import { apiFetch } from "@/lib/http";

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
  params?: { per_page?: number; page?: number; q?: string }
) {
  return apiFetch(`/admin/merchants/pending${qs(params ?? {})}`, { method: "GET", token });
}

export async function adminMerchantShow(token: string, merchantUserId: number) {
  return apiFetch(`/admin/merchants/${merchantUserId}`, { method: "GET", token });
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
