import { apiFetch, envStr } from "@/lib/http";

export type ManualPromotionStatus = "active" | "disabled" | "inactive" | string;

export type ManualPromotion = {
  id: number;
  code: string;

  // Money rules: integers only
  discount_type: "fixed_points" | "percent" | string;
  discount_value: number;

  // Scheduling / limits
  starts_at?: string | null;
  ends_at?: string | null;
  max_redemptions?: number | null;
  per_user_limit?: number | null;

  // Status + timestamps
  status: ManualPromotionStatus;
  disabled_at?: string | null;

  // Optional counters if API returns them (safe to ignore if absent)
  claims_count?: number | null;
  total_claims?: number | null;
  redemptions_count?: number | null;

  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateManualPromotionPayload = {
  code: string;
  discount_type: "fixed_points" | "percent";
  discount_value: number;

  starts_at?: string | null;
  ends_at?: string | null;

  max_redemptions?: number | null;
  per_user_limit?: number | null;
};

function adminManualPromotionsBase(): string {
  // apiFetch should already prefix /api/v1 (based on your existing pattern)
  return envStr("VITE_ADMIN_MANUAL_PROMOTIONS_PATH", "/admin/manual-promotions");
}

export async function adminManualPromotionsList(token: string | null): Promise<{ data: ManualPromotion[] }> {
  return apiFetch<{ data: ManualPromotion[] }>(adminManualPromotionsBase(), {
    method: "GET",
    token: token ?? null,
  });
}

export async function adminManualPromotionsCreate(
  token: string | null,
  payload: CreateManualPromotionPayload
): Promise<{ data: ManualPromotion } | ManualPromotion> {
  return apiFetch<{ data: ManualPromotion } | ManualPromotion>(adminManualPromotionsBase(), {
    method: "POST",
    token: token ?? null,
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}

export async function adminManualPromotionsDisable(token: string | null, id: number): Promise<void> {
  const path = `${adminManualPromotionsBase()}/${id}/disable`;
  await apiFetch<void>(path, {
    method: "POST",
    token: token ?? null,
    headers: { Accept: "application/json" },
  });
}

export async function adminManualPromotionsDelete(token: string | null, id: number): Promise<void> {
  const path = `${adminManualPromotionsBase()}/${id}`;
  await apiFetch<void>(path, {
    method: "DELETE",
    token: token ?? null,
    headers: { Accept: "application/json" },
  });
}
