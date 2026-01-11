import { apiFetch } from "@/lib/http";
import type { MerchantKpiResource, MerchantKpiResponse } from "./types";

export type MerchantKpiParams = {
  storeId?: number;
  startDate?: string;
  endDate?: string;
};

export async function fetchMerchantKpi(token: string, params: MerchantKpiParams): Promise<MerchantKpiResource> {
  const search = new URLSearchParams();
  if (params.storeId) search.set("store_id", String(params.storeId));
  if (params.startDate) search.set("start_date", params.startDate);
  if (params.endDate) search.set("end_date", params.endDate);
  const qs = search.toString();
  const path = `/merchant/kpi${qs ? `?${qs}` : ""}`;
  const res = await apiFetch<MerchantKpiResponse>(path, { method: "GET", token });
  return res.data;
}
