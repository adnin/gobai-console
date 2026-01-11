import { apiFetch, envStr } from "@/lib/http";

export type FinancePromotion = {
  id: number;
  code: string;
  type: string;
  value: number;
  start_at?: string | null;
  end_at?: string | null;
  max_redemptions?: number | null;
  redemptions_count?: number | null;
  store_id?: number | null;
  // Additional financial fields: total_discount_given may be returned by API
  total_discount_given?: number | null;
};

export type FinancePromotionsOverview = {
  total_promotions: number;
  total_redemptions: number;
  total_discount_given: number;
};

function financePromotionsBase(): string {
  return envStr("VITE_FINANCE_PROMOTIONS_PATH", "/finance/promotions");
}

export async function financePromotionsList(token: string | null): Promise<{ data: FinancePromotion[] }> {
  return apiFetch<{ data: FinancePromotion[] }>(financePromotionsBase(), {
    method: "GET",
    token: token ?? null,
  });
}

export async function financePromotionsOverview(token: string | null): Promise<FinancePromotionsOverview> {
  const path = `${financePromotionsBase()}/overview`;
  return apiFetch<FinancePromotionsOverview>(path, {
    method: "GET",
    token: token ?? null,
  });
}