import { apiFetch, envStr } from "@/lib/http";

export type PartnerPromotion = {
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

export type CreatePartnerPromotionPayload = {
  code: string;
  type: string;
  value: number;
  start_at?: string | null;
  end_at?: string | null;
  max_redemptions?: number | null;
  store_id?: number | null;
};

function partnerPromotionsBase(): string {
  return envStr("VITE_PARTNER_PROMOTIONS_PATH", "/partner/promotions");
}

export async function partnerPromotionsList(token: string | null): Promise<{ data: PartnerPromotion[] }> {
  return apiFetch<{ data: PartnerPromotion[] }>(partnerPromotionsBase(), {
    method: "GET",
    token: token ?? null,
  });
}

export async function partnerCreatePromotion(
  token: string | null,
  payload: CreatePartnerPromotionPayload
): Promise<PartnerPromotion> {
  return apiFetch<PartnerPromotion>(partnerPromotionsBase(), {
    method: "POST",
    token: token ?? null,
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}

export async function partnerDeletePromotion(token: string | null, id: number): Promise<void> {
  const path = `${partnerPromotionsBase()}/${id}`;
  await apiFetch<void>(path, {
    method: "DELETE",
    token: token ?? null,
  });
}