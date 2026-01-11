import type { AdminKpiRange } from "./types";

export const adminKpiKeys = {
  finance: () => ["admin", "kpi", "finance"] as const,
  systemStatus: () => ["admin", "kpi", "system", "status"] as const,
  opsOverview: (range: AdminKpiRange, start: string, end: string) => ["admin", "kpi", "ops", range, start, end] as const,
};
