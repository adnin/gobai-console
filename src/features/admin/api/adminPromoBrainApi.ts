import { apiFetch, envStr } from "@/lib/http";

export type PromoBrainRunRow = {
  id: number;
  run_date: string;
  slot: "am" | "pm" | string;
  status: string;
  started_at?: string | null;
  finished_at?: string | null;
  snapshot?: any;
  published?: any;
  meta?: any;
};

export type PromoBrainRunResult = {
  ok: boolean;
  run_id?: number | null;
  slot?: string;
  dry_run?: boolean;
  force?: boolean;
  published?: any;
  snapshot?: any;
  message?: string;
};

export type PromoBrainDiagnoseResponse = {
  preview: any;
  assignments: any[];
};

function base(): string {
  // apiFetch already prefixes VITE_API_BASE_URL (default: /api/v1)
  return envStr("VITE_ADMIN_PROMO_BRAIN_PATH", "/admin/promo-brain");
}

export async function adminPromoBrainRun(
  token: string | null,
  payload: { slot?: "am" | "pm"; dry_run?: boolean; force?: boolean }
): Promise<PromoBrainRunResult> {
  return apiFetch<PromoBrainRunResult>(`${base()}/run`, {
    method: "POST",
    token: token ?? null,
    body: JSON.stringify(payload ?? {}),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}

export async function adminPromoBrainRuns(
  token: string | null,
  limit = 30
): Promise<{ data: PromoBrainRunRow[] }> {
  return apiFetch<{ data: PromoBrainRunRow[] }>(`${base()}/runs?limit=${encodeURIComponent(String(limit))}`, {
    method: "GET",
    token: token ?? null,
  });
}

export async function adminPromoBrainRunGet(
  token: string | null,
  id: number
): Promise<{ data: PromoBrainRunRow }> {
  return apiFetch<{ data: PromoBrainRunRow }>(`${base()}/runs/${id}`, {
    method: "GET",
    token: token ?? null,
  });
}

export async function adminPromoBrainDiagnose(
  token: string | null,
  params: {
    user_id: number;
    flow_type: "transport" | "parcel" | "store";
    platform_fee_points: number;
    promo_code?: string | null;
    bundle_key?: string | null;
    auto_apply?: boolean;
    pickup_latitude?: number | null;
    pickup_longitude?: number | null;
  }
): Promise<PromoBrainDiagnoseResponse> {
  const qs = new URLSearchParams();
  qs.set("user_id", String(params.user_id));
  qs.set("flow_type", params.flow_type);
  qs.set("platform_fee_points", String(params.platform_fee_points));
  if (params.promo_code) qs.set("promo_code", params.promo_code);
  if (params.bundle_key) qs.set("bundle_key", params.bundle_key);
  if (typeof params.auto_apply === "boolean") qs.set("auto_apply", String(params.auto_apply));
  if (params.pickup_latitude != null) qs.set("pickup_latitude", String(params.pickup_latitude));
  if (params.pickup_longitude != null) qs.set("pickup_longitude", String(params.pickup_longitude));

  return apiFetch<PromoBrainDiagnoseResponse>(`${base()}/diagnose?${qs.toString()}`, {
    method: "GET",
    token: token ?? null,
  });
}
