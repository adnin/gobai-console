import { apiFetch } from "@/lib/http";

function qs(params: Record<string, any>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export type FinanceOverview = { ok: boolean; module?: string };
export async function financeOverview(token: string): Promise<FinanceOverview> {
  return apiFetch(`/finance/overview`, { method: "GET", token });
}

export type FinanceDashboardOverview = {
  ok?: boolean;
  wallets?: {
    driver_total_points: number;
    merchant_total_points: number;
    customer_total_points: number;
  };
  requests?: {
    topups_pending: number;
    cashouts_pending: number;
    topups_today_points: number;
    cashouts_today_points: number;
  };
  reconciliation?: {
    last_report?: any;
  };
};

export async function financeDashboard(token: string): Promise<FinanceDashboardOverview> {
  // Backend route: GET /finance/overview (FinanceDashboardController@overview)
  return apiFetch(`/finance/overview`, { method: "GET", token });
}

export async function financeCustomerBalances(
  token: string,
  params?: { q?: string; min_balance?: number; per_page?: number }
): Promise<{ data: any[]; meta: any }>{
  // Backend route: GET /finance/wallets/{kind}/balances where kind=customer
  return apiFetch(`/finance/wallets/customer/balances${qs({ per_page: 25, ...params })}`, { method: "GET", token });
}

export type FinanceAdjustPayload = {
  wallet: "customer";
  direction: "credit" | "debit";
  user_id: number;
  points: number;
  reason: string;
};

export async function financeAdjust(token: string, payload: FinanceAdjustPayload): Promise<any> {
  return apiFetch(`/finance/wallets/adjust`, { method: "POST", token, body: JSON.stringify(payload) });
}

export async function financeReconcileReports(
  token: string,
  params?: { per_page?: number; dry_run?: boolean; from?: string; to?: string }
): Promise<any> {
  return apiFetch(`/finance/reconcile/reports${qs({ per_page: 50, ...params })}`, { method: "GET", token });
}

export async function financeReconcileShow(token: string, id: number): Promise<{ report: any }>{
  return apiFetch(`/finance/reconcile/reports/${id}`, { method: "GET", token });
}

export async function financeReconcileRun(
  token: string,
  payload?: { dry_run?: boolean; repair?: boolean }
): Promise<{ message: string; report: any; output?: string }>{
  return apiFetch(`/finance/reconcile/run`, { method: "POST", token, body: JSON.stringify(payload ?? {}) });
}
