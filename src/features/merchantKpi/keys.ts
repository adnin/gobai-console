import type { MerchantKpiRange } from "./types";

export const merchantKpiKeys = {
  all: ["merchantKpi"] as const,
  list: (range: MerchantKpiRange, startDate: string, endDate: string, storeId?: number | null) =>
    [...merchantKpiKeys.all, { range, startDate, endDate, storeId: storeId ?? null }] as const,
};
