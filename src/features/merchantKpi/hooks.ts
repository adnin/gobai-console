import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchMerchantKpi } from "./api";
import { merchantKpiKeys } from "./keys";
import type { MerchantKpiRange, MerchantKpiResource } from "./types";

const RANGE_DAY_SPAN: Record<MerchantKpiRange, number> = {
  today: 0,
  "7d": 6,
  "30d": 29,
};

export function normalizeMerchantKpiRange(value: string | null | undefined): MerchantKpiRange {
  if (value === "7d" || value === "30d") return value;
  return "today";
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveMerchantKpiRangeDates(range: MerchantKpiRange) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - RANGE_DAY_SPAN[range]);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

export function useMerchantKpi(range: MerchantKpiRange, options?: { storeId?: number; enabled?: boolean }) {
  const { token } = useAuth();
  const params = React.useMemo(() => {
    const { startDate, endDate } = resolveMerchantKpiRangeDates(range);
    return { startDate, endDate, storeId: options?.storeId };
  }, [range, options?.storeId]);

  const enabled = !!token && (options?.enabled ?? true);

  return useQuery<MerchantKpiResource, Error>({
    queryKey: merchantKpiKeys.list(range, params.startDate, params.endDate, params.storeId ?? null),
    queryFn: async () => {
      if (!token) {
        throw new Error("Not authenticated");
      }
      return fetchMerchantKpi(token, {
        storeId: params.storeId,
        startDate: params.startDate,
        endDate: params.endDate,
      });
    },
    enabled,
    staleTime: 30_000,
  });
}
