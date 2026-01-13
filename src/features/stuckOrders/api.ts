import { apiFetch } from "@/lib/http";
import type { StuckOrdersResponse } from "./types";

export type FetchStuckOrdersParams = {
  limit?: number;
};

export async function fetchStuckOrders(token: string, params: FetchStuckOrdersParams = {}) {
  const search = new URLSearchParams();
  if (params.limit) {
    search.set("limit", String(params.limit));
  }
  const query = search.toString();
  const path = query ? `/ops/orders/stuck?${query}` : "/ops/orders/stuck";
  return apiFetch<StuckOrdersResponse>(path, { token });
}
