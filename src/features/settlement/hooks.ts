import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { fetchMerchantSettlementSummary } from "./api";
import { settlementKeys } from "./keys";
import type { MerchantSettlementSummaryResponse } from "./types";

function canSelectStore(storeId?: number | null): storeId is number {
  return typeof storeId === "number" && Number.isFinite(storeId);
}

export function useMerchantSettlementSummary(storeId?: number | null) {
  const { token } = useAuth();
  const enabled = !!token;
  const selectedStoreId = canSelectStore(storeId) ? storeId : null;

  return useQuery<MerchantSettlementSummaryResponse, ApiError>({
    queryKey: settlementKeys.merchant.summary(selectedStoreId),
    queryFn: () =>
      fetchMerchantSettlementSummary(
        token!,
        selectedStoreId === null ? undefined : { storeId: selectedStoreId }
      ),
    enabled,
    refetchInterval: 30_000,
    retry: (failureCount, error) => {
      if (error?.status === 403) return false;
      return failureCount < 3;
    },
  });
}
