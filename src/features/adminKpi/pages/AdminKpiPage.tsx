import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, BarChart3, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/rbac";
import { KpiCard } from "@/ui/kpi/KpiCard";
import { KpiGrid } from "@/ui/kpi/KpiGrid";
import { KpiRangePicker, type KpiRangeValue } from "@/ui/kpi/KpiRangePicker";
import { normalizeAdminRange, resolveAdminRangeDates, useAdminFinance, useAdminSystemStatus } from "../hooks";
import { useOpsOverview } from "@/features/opsKpi/hooks";

const ALLOWED_ROLES: Role[] = ["admin", "system"];

function hasAccess(roles: Role[] | undefined | null) {
  return (roles ?? []).some((r) => ALLOWED_ROLES.includes(r));
}

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return currencyFormatter.format(value ?? 0);
}

function formatNumber(value?: number | null) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
}

function describeWindow(start?: string, end?: string, days?: number) {
  if (!start && !end) return "Range not set";
  const base = start === end ? start ?? end ?? "Range not set" : `${start ?? "?"} → ${end ?? "?"}`;
  return days ? `${base} (${days}d)` : base;
}

function formatBoolean(ok?: boolean | null) {
  if (ok === undefined || ok === null) return "—";
  return ok ? "OK" : "Check";
}

export function AdminKpiPage() {
  const { viewer } = useAuth();
  const allowed = hasAccess(viewer?.roles);
  const [searchParams, setSearchParams] = useSearchParams();
  const rangeParam = searchParams.get("range");
  const range = normalizeAdminRange(rangeParam);

  React.useEffect(() => {
    if (rangeParam !== range) {
      const next = new URLSearchParams(searchParams);
      next.set("range", range);
      setSearchParams(next, { replace: true });
    }
  }, [rangeParam, range, searchParams, setSearchParams]);

  const { startDate, endDate } = React.useMemo(() => resolveAdminRangeDates(range), [range]);

  const overviewQuery = useOpsOverview(range, allowed);
  const financeQuery = useAdminFinance(allowed);
  const systemQuery = useAdminSystemStatus(allowed);

  const isLoading = overviewQuery.isLoading && !overviewQuery.data;
  const hasError = overviewQuery.isError || financeQuery.isError || systemQuery.isError;
  const firstError =
    (overviewQuery.error as Error | undefined)?.message ||
    (financeQuery.error as Error | undefined)?.message ||
    (systemQuery.error as Error | undefined)?.message;

  const data = overviewQuery.data;
  const finance = financeQuery.data;
  const system = systemQuery.data;

  const isEmpty = data && data.orders.total === 0;

  const [refreshing, setRefreshing] = React.useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([overviewQuery.refetch(), financeQuery.refetch(), systemQuery.refetch()]);
    setRefreshing(false);
  };

  const handleRangeChange = (next: KpiRangeValue) => {
    const normalized = normalizeAdminRange(String(next));
    const params = new URLSearchParams(searchParams);
    params.set("range", normalized);
    setSearchParams(params, { replace: true });
  };

  if (!allowed) {
    return (
      <div className="p-6">
        <EmptyState
          title="Access restricted"
          description="You need an admin role to view admin KPIs."
          icon={Shield}
          actions={
            <Button asChild>
              <Link to="/admin">Back to admin home</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold">Admin KPI Dashboard</div>
            <div className="text-sm text-muted-foreground">Platform health, money indicators, and ops rollups.</div>
          </div>
          <KpiRangePicker value={range} onValueChange={handleRangeChange} disabled />
        </div>
        <KpiGrid>
          {Array.from({ length: 6 }).map((_, idx) => (
            <KpiCard key={`s-${idx}`} title="Loading" loading />
          ))}
        </KpiGrid>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-6">
        <EmptyState
          title="Unable to load admin KPIs"
          description={firstError || "Please retry."}
          icon={AlertTriangle}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleRefresh()} disabled={refreshing}>
                {refreshing ? "Retrying…" : "Try again"}
              </Button>
              <Button asChild variant="secondary">
                <Link to="/admin">Go to admin home</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  if (!data || isEmpty) {
    return (
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold">Admin KPI Dashboard</div>
            <div className="text-sm text-muted-foreground">Platform health, money indicators, and ops rollups.</div>
          </div>
          <KpiRangePicker value={range} onValueChange={handleRangeChange} />
        </div>
        <div className="mt-6">
          <EmptyState
            title="No activity for this window"
            description="We could not find orders for the selected range. Try a longer window."
            icon={BarChart3}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => handleRangeChange("7d")}>View last 7 days</Button>
                <Button asChild>
                  <Link to="/admin">Back to admin home</Link>
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const systemOk = system?.ok ?? false;
  const dbOk = system?.checks?.db?.ok ?? null;
  const cacheOk = system?.checks?.cache?.ok ?? null;
  const failedJobs = system?.queue?.failed_jobs ?? null;

  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Admin KPI Dashboard</div>
          <div className="text-sm text-muted-foreground">Platform health, money indicators, and ops rollups.</div>
        </div>
        <div className="flex items-center gap-2">
          <KpiRangePicker value={range} onValueChange={handleRangeChange} disabled={refreshing || overviewQuery.isFetching} />
          <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={refreshing || overviewQuery.isFetching}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {refreshing || overviewQuery.isFetching ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Ops window</CardTitle>
            <div className="text-sm text-muted-foreground">{describeWindow(data.window?.start, data.window?.end, data.window?.days)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">range={range}</Badge>
            <Badge variant="outline">start={startDate}</Badge>
            <Badge variant="outline">end={endDate}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <KpiGrid>
            <KpiCard title="Orders total" value={formatNumber(data.orders.total)} subtitle="All orders created" />
            <KpiCard title="Completed" value={formatNumber(data.orders.completed)} subtitle="Delivered / completed" />
            <KpiCard title="Cancelled" value={formatNumber(data.orders.cancelled)} subtitle="Cancelled or failed" />
            <KpiCard title="Pending" value={formatNumber(data.orders.pending)} subtitle="Awaiting assignment" />
            <KpiCard title="Revenue" value={formatCurrency(data.finance.revenue_total)} subtitle="Total price sum" />
            <KpiCard
              title="Avg delivery time"
              value={`${(data.delivery.avg_delivery_minutes ?? 0).toFixed(1)} min`}
              subtitle="Accepted → delivered"
            />
            <KpiCard title="Active drivers" value={formatNumber(data.drivers.active)} subtitle="Seen in last 10m" />
            <KpiCard title="Idle drivers" value={formatNumber(data.drivers.idle)} subtitle="Away or waiting" />
          </KpiGrid>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-1">
            <CardTitle className="text-base">Wallet health</CardTitle>
            <div className="text-sm text-muted-foreground">Balances and pending wallet actions.</div>
          </CardHeader>
          <CardContent>
            {financeQuery.isLoading && !finance ? (
              <KpiGrid>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <KpiCard key={`fin-${idx}`} title="Loading" loading />
                ))}
              </KpiGrid>
            ) : finance ? (
              <div className="space-y-3">
                <KpiGrid>
                  <KpiCard title="Driver points" value={formatNumber(finance.wallets?.driver_total_points)} subtitle="Total points" />
                  <KpiCard title="Merchant points" value={formatNumber(finance.wallets?.merchant_total_points)} subtitle="Total points" />
                  <KpiCard title="Customer points" value={formatNumber(finance.wallets?.customer_total_points)} subtitle="Total points" />
                  <KpiCard title="Topups pending" value={formatNumber(finance.requests?.topups_pending)} subtitle="Awaiting approval" />
                  <KpiCard title="Cashouts pending" value={formatNumber(finance.requests?.cashouts_pending)} subtitle="Awaiting approval" />
                  <KpiCard
                    title="Today net flow"
                    value={formatNumber((finance.requests?.topups_today_points ?? 0) - (finance.requests?.cashouts_today_points ?? 0))}
                    subtitle="Topups - cashouts"
                  />
                </KpiGrid>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  {finance.reconciliation?.last_report ? (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Latest reconcile report</div>
                      <div>Report ID: <span className="font-semibold">{finance.reconciliation.last_report.id}</span></div>
                      <div>Dry run: <span className="font-semibold">{String(!!finance.reconciliation.last_report.is_dry_run)}</span></div>
                      <div className="text-muted-foreground">Created: {String(finance.reconciliation.last_report.created_at ?? "—")}</div>
                      <Button asChild variant="secondary" className="mt-2 w-full">
                        <Link to={`/finance/reconcile/${finance.reconciliation.last_report.id}`}>View report</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No reconciliation reports yet.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Finance data unavailable.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-1">
            <CardTitle className="text-base">System health</CardTitle>
            <div className="text-sm text-muted-foreground">Core service checks and queue signals.</div>
          </CardHeader>
          <CardContent>
            {systemQuery.isLoading && !system ? (
              <KpiGrid>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <KpiCard key={`sys-${idx}`} title="Loading" loading />
                ))}
              </KpiGrid>
            ) : system ? (
              <div className="space-y-3">
                <KpiGrid>
                  <KpiCard title="System" value={systemOk ? "Healthy" : "Attention"} subtitle={`Checked at ${system.time ?? "—"}`} deltaLabel={system.app?.env ?? "env"} deltaTrend={systemOk ? "up" : "down"} />
                  <KpiCard title="DB" value={formatBoolean(dbOk)} subtitle="Database connectivity" deltaTrend={dbOk ? "up" : "down"} />
                  <KpiCard title="Cache" value={formatBoolean(cacheOk)} subtitle="Cache connectivity" deltaTrend={cacheOk ? "up" : "down"} />
                  <KpiCard
                    title="Failed jobs"
                    value={failedJobs === null ? "n/a" : formatNumber(failedJobs)}
                    subtitle="Queue failures"
                    deltaTrend={failedJobs && failedJobs > 0 ? "down" : "up"}
                  />
                </KpiGrid>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Orders by status</div>
                  {Object.keys(system.metrics?.orders_by_status ?? {}).length ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(system.metrics.orders_by_status).map(([status, total]) => (
                        <div key={status} className="flex items-center justify-between rounded-md border border-border bg-card px-2 py-1">
                          <span className="capitalize text-muted-foreground">{status}</span>
                          <span className="font-semibold">{formatNumber(total)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No status data.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">System status unavailable.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
