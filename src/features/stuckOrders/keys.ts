export const stuckOrderKeys = {
  all: ["ops", "stuckOrders"] as const,
  list: (params: { limit: number }) => ["ops", "stuckOrders", "list", params] as const,
};
