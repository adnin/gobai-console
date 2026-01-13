import { apiFetch } from "@/lib/http";
import type {
  DriverWallet,
  DriverWalletLedgerResponse,
  AdminDriverWalletSnapshot,
  AdminDriverWalletLedgerResponse,
} from "./types";

export async function fetchDriverWallet(token: string): Promise<DriverWallet> {
  return apiFetch<DriverWallet>("/driver/wallet", { method: "GET", token });
}

export async function fetchDriverWalletLedger(token: string): Promise<DriverWalletLedgerResponse> {
  return apiFetch<DriverWalletLedgerResponse>("/driver/wallet/ledger", { method: "GET", token });
}

export async function fetchAdminDriverWallet(token: string, driverId: number): Promise<AdminDriverWalletSnapshot> {
  return apiFetch<AdminDriverWalletSnapshot>(`/admin/drivers/${driverId}/wallet`, { method: "GET", token });
}

export async function fetchAdminDriverWalletLedger(
  token: string,
  driverId: number,
  params?: { page?: number; per_page?: number }
): Promise<AdminDriverWalletLedgerResponse> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.per_page) sp.set("per_page", String(params.per_page));
  const query = sp.toString();
  return apiFetch<AdminDriverWalletLedgerResponse>(
    `/admin/drivers/${driverId}/wallet/ledger${query ? `?${query}` : ""}`,
    { method: "GET", token }
  );
}
