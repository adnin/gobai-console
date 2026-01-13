export const settlementKeys = {
  all: () => ["settlement"] as const,
  merchant: {
    all: () => [...settlementKeys.all(), "merchant"] as const,
    summary: (storeId: number | null | undefined) => [
      ...settlementKeys.merchant.all(),
      "summary",
      storeId ?? "default",
    ] as const,
  },
};
