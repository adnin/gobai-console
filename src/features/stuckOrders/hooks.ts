import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { fetchStuckOrders, type FetchStuckOrdersParams } from "./api";
import { stuckOrderKeys } from "./keys";
import type { StuckOrdersResponse } from "./types";

function ensureToken(token?: string | null) {
  if (!token) throw new Error("Not authenticated");
  return token;
}

export function useStuckOrders(params: FetchStuckOrdersParams = {}, enabled = true) {
  const { token } = useAuth();
  const canQuery = !!token && enabled;
  const limit = params.limit ?? 100;

  return useQuery<StuckOrdersResponse, ApiError>({
    queryKey: stuckOrderKeys.list({ limit }),
    queryFn: async () => fetchStuckOrders(ensureToken(token), { limit }),
    enabled: canQuery,
    staleTime: 30_000,
  });
}
