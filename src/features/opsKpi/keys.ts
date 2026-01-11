import type { OpsKpiRange } from "./types";

export const opsKpiKeys = {
  overview: (range: OpsKpiRange, start: string, end: string) => ["ops", "kpi", "overview", range, start, end] as const,
  orders: (range: OpsKpiRange, start: string, end: string) => ["ops", "kpi", "orders", range, start, end] as const,
  drivers: (range: OpsKpiRange, start: string, end: string) => ["ops", "kpi", "drivers", range, start, end] as const,
  inventory: (range: OpsKpiRange, start: string, end: string, threshold: number | null) =>
    ["ops", "kpi", "inventory", range, start, end, threshold] as const,
  fraud: (range: OpsKpiRange, start: string, end: string) => ["ops", "kpi", "fraud", range, start, end] as const,
  parcelCod: () => ["ops", "kpi", "parcel-cod"] as const,
};
