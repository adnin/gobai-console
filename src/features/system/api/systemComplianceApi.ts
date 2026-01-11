import { apiFetch } from "@/lib/http";

export type ComplianceSummaryCreatePayload = {
  type: string;
  source_type: string;
  source_id: number;
  priority?: string;
  meta?: {
    requested_reason?: string;
    requested_by_user_id?: number;
  };
  options?: {
    redact_pii?: boolean;
    include_timeline?: boolean;
    include_risk_flags?: boolean;
  };
};

export type ComplianceSummaryCreateResponse = {
  summary_id?: number;
  status?: string;
  queued_at?: string;
  rid?: string;
};

export type ComplianceSummaryRow = {
  id: number;
  type?: string;
  source_type?: string;
  source_id?: number;
  status?: string;
  created_at?: string;
  completed_at?: string;
};

export type ComplianceSummaryListResponse = {
  data: ComplianceSummaryRow[];
  meta?: { page?: number; per_page?: number; total?: number };
};

export type ComplianceSummaryDetail = {
  id: number;
  type?: string;
  source_type?: string;
  source_id?: number;
  status?: string;
  summary?: Record<string, any>;
  ai_meta?: Record<string, any>;
  created_at?: string;
  completed_at?: string;
  rid?: string;
};

function qs(params: Record<string, any>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function complianceSummaryCreate(
  token: string,
  payload: ComplianceSummaryCreatePayload
): Promise<ComplianceSummaryCreateResponse> {
  return apiFetch(`/system/compliance/summaries`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function complianceSummaryList(
  token: string,
  params?: { status?: string; page?: number; per_page?: number }
): Promise<ComplianceSummaryListResponse> {
  return apiFetch(`/system/compliance/summaries${qs({ page: 1, per_page: 20, ...params })}`, {
    method: "GET",
    token,
  });
}

export async function complianceSummaryGet(
  token: string,
  summaryId: number
): Promise<ComplianceSummaryDetail> {
  return apiFetch(`/system/compliance/summaries/${summaryId}`, { method: "GET", token });
}
