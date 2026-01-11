import { apiFetch, envStr } from "@/lib/http";

export type AdminPromotion = {
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

export type CreateAdminPromotionPayload = {
  code: string;
  type: string;
  value: number;
  start_at?: string | null;
  end_at?: string | null;
  max_redemptions?: number | null;
  store_id?: number | null;
};

function adminPromotionsBase(): string {
  return envStr("VITE_ADMIN_PROMOTIONS_PATH", "/admin/promotions");
}

export async function adminPromotionsList(token: string | null): Promise<{ data: AdminPromotion[] }> {
  return apiFetch<{ data: AdminPromotion[] }>(adminPromotionsBase(), {
    method: "GET",
    token: token ?? null,
  });
}

export async function adminCreatePromotion(
  token: string | null,
  payload: CreateAdminPromotionPayload
): Promise<AdminPromotion> {
  return apiFetch<AdminPromotion>(adminPromotionsBase(), {
    method: "POST",
    token: token ?? null,
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}

export async function adminDeletePromotion(token: string | null, id: number): Promise<void> {
  const path = `${adminPromotionsBase()}/${id}`;
  await apiFetch<void>(path, {
    method: "DELETE",
    token: token ?? null,
  });
}