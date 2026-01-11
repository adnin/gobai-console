import { apiFetch } from "@/lib/http";
import type {
  OpsOverviewResponse,
  OpsOrdersResponse,
  OpsDriversResponse,
  OpsInventoryResponse,
  OpsFraudResponse,
  OpsParcelCodResponse,
} from "./types";

export type OpsRangeParams = {
  startDate: string;
  endDate: string;
};

function buildQuery(params: OpsRangeParams, extras?: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  search.set("start", params.startDate);
  search.set("end", params.endDate);
  if (extras) {
    Object.entries(extras).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, String(value));
      }
    });
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchOpsOverview(token: string, params: OpsRangeParams): Promise<OpsOverviewResponse> {
  const res = await apiFetch<OpsOverviewResponse>(`/ops/analytics/overview${buildQuery(params)}` as const, {
    method: "GET",
    token,
  });
  return res;
}

export async function fetchOpsOrders(token: string, params: OpsRangeParams): Promise<OpsOrdersResponse> {
  const res = await apiFetch<OpsOrdersResponse>(`/ops/analytics/orders${buildQuery(params)}` as const, {
    method: "GET",
    token,
  });
  return res;
}

export async function fetchOpsDrivers(token: string, params: OpsRangeParams): Promise<OpsDriversResponse> {
  const res = await apiFetch<OpsDriversResponse>(`/ops/analytics/drivers${buildQuery(params)}` as const, {
    method: "GET",
    token,
  });
  return res;
}

export async function fetchOpsInventory(
  token: string,
  params: OpsRangeParams,
  options?: { lowStockThreshold?: number }
): Promise<OpsInventoryResponse> {
  const res = await apiFetch<OpsInventoryResponse>(
    `/ops/analytics/inventory${buildQuery(params, { low_stock_threshold: options?.lowStockThreshold })}` as const,
    {
      method: "GET",
      token,
    }
  );
  return res;
}

export async function fetchOpsFraud(token: string, params: OpsRangeParams): Promise<OpsFraudResponse> {
  const res = await apiFetch<OpsFraudResponse>(`/ops/analytics/fraud${buildQuery(params)}` as const, {
    method: "GET",
    token,
  });
  return res;
}

export async function fetchOpsParcelCod(token: string): Promise<OpsParcelCodResponse> {
  const res = await apiFetch<OpsParcelCodResponse>("/ops/analytics/parcel-cod", {
    method: "GET",
    token,
  });
  return res;
}
