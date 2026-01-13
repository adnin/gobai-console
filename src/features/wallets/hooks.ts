import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  fetchDriverWallet,
  fetchDriverWalletLedger,
  fetchAdminDriverWallet,
  fetchAdminDriverWalletLedger,
} from "./api";
import { driverWalletKeys } from "./keys";
import type { AdminDriverWalletSnapshot, AdminDriverWalletLedgerResponse } from "./types";

export function useDriverWallet() {
  const { token } = useAuth();
  const enabled = !!token;

  return useQuery({
    queryKey: driverWalletKeys.balance(),
    queryFn: () => fetchDriverWallet(token!),
    enabled,
    refetchInterval: 15_000,
  });
}

export function useDriverWalletLedger() {
  const { token } = useAuth();
  const enabled = !!token;

  return useQuery({
    queryKey: driverWalletKeys.ledger(),
    queryFn: () => fetchDriverWalletLedger(token!),
    enabled,
  });
}

function canQueryDriver(driverId: number | null | undefined): driverId is number {
  return typeof driverId === "number" && Number.isFinite(driverId) && driverId > 0;
}

export function useAdminDriverWallet(driverId: number | null) {
  const { token } = useAuth();
  const enabled = !!token && canQueryDriver(driverId);

  return useQuery<AdminDriverWalletSnapshot>({
    queryKey: driverWalletKeys.admin.detail(enabled ? driverId : null),
    queryFn: () => fetchAdminDriverWallet(token!, driverId!),
    enabled,
    staleTime: 10_000,
  });
}

export function useAdminDriverWalletLedger(driverId: number | null, page: number) {
  const { token } = useAuth();
  const enabled = !!token && canQueryDriver(driverId) && page > 0;
  const safePage = Math.max(1, page);

  return useQuery<AdminDriverWalletLedgerResponse>({
    queryKey: driverWalletKeys.admin.ledger(enabled ? driverId : null, safePage),
    queryFn: () => fetchAdminDriverWalletLedger(token!, driverId!, { page: safePage, per_page: 25 }),
    enabled,
    placeholderData: (prev) => prev,
  });
}
