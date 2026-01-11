import { apiFetch, envStr } from "@/lib/http";

/**
 * Promotion type definition. Aligns with backend promo schema:
 * id: unique identifier
 * code: promo code string
 * type: fixed|percent|free (extend as needed)
 * value: discount value (points or percentage)
 * start_at/end_at: ISO datetimes marking validity window
 * max_redemptions: optional cap on total uses
 * redemptions_count: how many times the promotion has been used
 * store_id: nullable; if present promotion is store‑specific
 */
export type MerchantPromotion = {
  id: number;
  code: string;
  type: string;
  value: number;
  start_at?: string | null;
  end_at?: string | null;
  max_redemptions?: number | null;
  redemptions_count?: number | null;
  store_id?: number | null;
};

/**
 * Input payload for creating a promotion. Mirrors backend fields.
 */
export type CreateMerchantPromotionPayload = {
  code: string;
  type: string;
  value: number;
  start_at?: string | null;
  end_at?: string | null;
  max_redemptions?: number | null;
};

// Helper to read base path from env. Allows override per deployment.
function merchantPromotionsBase(): string {
  return envStr("VITE_MERCHANT_PROMOTIONS_PATH", "/merchant/promotions");
}

/**
 * Fetch the merchant's promotions list. Returns array wrapped in { data } for consistency
 * with other endpoints. In case of failure, apiFetch throws an ApiError with message.
 */
export async function merchantPromotionsList(
  token: string | null
): Promise<{ data: MerchantPromotion[] }> {
  return apiFetch<{ data: MerchantPromotion[] }>(merchantPromotionsBase(), {
    method: "GET",
    token: token ?? null,
  });
}

/**
 * Create a new promotion. Accepts payload describing the promotion. Returns created record.
 */
export async function merchantCreatePromotion(
  token: string | null,
  payload: CreateMerchantPromotionPayload
): Promise<MerchantPromotion> {
  return apiFetch<MerchantPromotion>(merchantPromotionsBase(), {
    method: "POST",
    token: token ?? null,
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}

/**
 * Delete an existing promotion by ID. Returns empty response (204) on success.
 */
export async function merchantDeletePromotion(
  token: string | null,
  id: number
): Promise<void> {
  const path = `${merchantPromotionsBase()}/${id}`;
  await apiFetch<void>(path, {
    method: "DELETE",
    token: token ?? null,
  });
}