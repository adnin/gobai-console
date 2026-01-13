import { apiFetch } from "@/lib/http";
import type { MerchantSettlementSummaryResponse } from "./types";

export async function fetchMerchantSettlementSummary(
  token: string,
  params?: { storeId?: number | null }
): Promise<MerchantSettlementSummaryResponse> {
  const search = new URLSearchParams();
  if (typeof params?.storeId === "number" && Number.isFinite(params.storeId)) {
    search.set("store_id", String(params.storeId));
  }
  const query = search.toString();
  return apiFetch<MerchantSettlementSummaryResponse>(
    `/merchant/settlements/summary${query ? `?${query}` : ""}`,
    { method: "GET", token }
  );
}
