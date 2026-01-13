export const driverWalletKeys = {
  all: () => ["driver-wallet"] as const,
  balance: () => [...driverWalletKeys.all(), "balance"] as const,
  ledger: () => [...driverWalletKeys.all(), "ledger"] as const,
  admin: {
    all: () => ["admin-driver-wallet"] as const,
    detail: (driverId: number | null | undefined) => [...driverWalletKeys.admin.all(), driverId ?? "unknown"] as const,
    ledger: (driverId: number | null | undefined, page: number) => [...driverWalletKeys.admin.all(), driverId ?? "unknown", "ledger", page] as const,
  },
};
