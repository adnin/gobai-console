import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { financeDashboard, type FinanceDashboardOverview } from "@/features/finance/api/financeApi";
import { normalizeOpsKpiRange, resolveOpsRangeDates } from "@/features/opsKpi/hooks";
import { fetchSystemStatus } from "./api";
import { adminKpiKeys } from "./keys";
import type { AdminKpiRange, SystemStatusResponse } from "./types";

function ensureToken(token?: string | null) {
  if (!token) {
    throw new Error("Not authenticated");
  }
  return token;
}

export function useAdminFinance(enabled = true) {
  const { token } = useAuth();
  const canQuery = !!token && enabled;

  return useQuery<FinanceDashboardOverview, Error>({
    queryKey: adminKpiKeys.finance(),
    queryFn: async () => financeDashboard(ensureToken(token)),
    enabled: canQuery,
    staleTime: 45_000,
  });
}

export function useAdminSystemStatus(enabled = true) {
  const { token } = useAuth();
  const canQuery = !!token && enabled;

  return useQuery<SystemStatusResponse, Error>({
    queryKey: adminKpiKeys.systemStatus(),
    queryFn: async () => fetchSystemStatus(ensureToken(token)),
    enabled: canQuery,
    staleTime: 30_000,
  });
}

export { normalizeOpsKpiRange as normalizeAdminRange, resolveOpsRangeDates as resolveAdminRangeDates };
export type { AdminKpiRange };
