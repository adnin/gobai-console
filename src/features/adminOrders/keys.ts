import type { AdminOrderFilters } from "./types";

export const adminOrderKeys = {
  list: (filters: AdminOrderFilters) => ["admin", "orders", "search", filters] as const,
  timeline: (orderId: number | string) => ["admin", "orders", "timeline", orderId] as const,
};
