import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  fetchOpsDrivers,
  fetchOpsFraud,
  fetchOpsInventory,
  fetchOpsOrders,
  fetchOpsOverview,
  fetchOpsParcelCod,
  type OpsRangeParams,
} from "./api";
import { opsKpiKeys } from "./keys";
import type {
  OpsDriversResponse,
  OpsFraudResponse,
  OpsInventoryResponse,
  OpsKpiRange,
  OpsOrdersResponse,
  OpsOverviewResponse,
  OpsParcelCodResponse,
} from "./types";

const RANGE_DAY_SPAN: Record<OpsKpiRange, number> = {
  today: 0,
  "7d": 6,
  "30d": 29,
};

export function normalizeOpsKpiRange(value: string | null | undefined): OpsKpiRange {
  if (value === "7d" || value === "30d") return value;
  return "today";
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveOpsRangeDates(range: OpsKpiRange): OpsRangeParams {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - RANGE_DAY_SPAN[range]);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function ensureToken(token?: string | null) {
  if (!token) {
    throw new Error("Not authenticated");
  }
  return token;
}

export function useOpsOverview(range: OpsKpiRange, enabled = true) {
  const { token } = useAuth();
  const params = React.useMemo(() => resolveOpsRangeDates(range), [range]);
  const canQuery = !!token && enabled;

  return useQuery<OpsOverviewResponse, Error>({
    queryKey: opsKpiKeys.overview(range, params.startDate, params.endDate),
    queryFn: async () => fetchOpsOverview(ensureToken(token), params),
    enabled: canQuery,
    staleTime: 30_000,
  });
}

export function useOpsOrders(range: OpsKpiRange, enabled = true) {
  const { token } = useAuth();
  const params = React.useMemo(() => resolveOpsRangeDates(range), [range]);
  const canQuery = !!token && enabled;

  return useQuery<OpsOrdersResponse, Error>({
    queryKey: opsKpiKeys.orders(range, params.startDate, params.endDate),
    queryFn: async () => fetchOpsOrders(ensureToken(token), params),
    enabled: canQuery,
    staleTime: 30_000,
  });
}

export function useOpsDrivers(range: OpsKpiRange, enabled = true) {
  const { token } = useAuth();
  const params = React.useMemo(() => resolveOpsRangeDates(range), [range]);
  const canQuery = !!token && enabled;

  return useQuery<OpsDriversResponse, Error>({
    queryKey: opsKpiKeys.drivers(range, params.startDate, params.endDate),
    queryFn: async () => fetchOpsDrivers(ensureToken(token), params),
    enabled: canQuery,
    staleTime: 30_000,
  });
}

export function useOpsInventory(range: OpsKpiRange, enabled = true, lowStockThreshold?: number) {
  const { token } = useAuth();
  const params = React.useMemo(() => resolveOpsRangeDates(range), [range]);
  const canQuery = !!token && enabled;

  return useQuery<OpsInventoryResponse, Error>({
    queryKey: opsKpiKeys.inventory(range, params.startDate, params.endDate, lowStockThreshold ?? null),
    queryFn: async () => fetchOpsInventory(ensureToken(token), params, { lowStockThreshold }),
    enabled: canQuery,
    staleTime: 45_000,
  });
}

export function useOpsFraud(range: OpsKpiRange, enabled = true) {
  const { token } = useAuth();
  const params = React.useMemo(() => resolveOpsRangeDates(range), [range]);
  const canQuery = !!token && enabled;

  return useQuery<OpsFraudResponse, Error>({
    queryKey: opsKpiKeys.fraud(range, params.startDate, params.endDate),
    queryFn: async () => fetchOpsFraud(ensureToken(token), params),
    enabled: canQuery,
    staleTime: 60_000,
  });
}

export function useOpsParcelCod(enabled = true) {
  const { token } = useAuth();
  const canQuery = !!token && enabled;

  return useQuery<OpsParcelCodResponse, Error>({
    queryKey: opsKpiKeys.parcelCod(),
    queryFn: async () => fetchOpsParcelCod(ensureToken(token)),
    enabled: canQuery,
    staleTime: 60_000,
  });
}
