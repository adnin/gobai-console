import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/rbac";
import { KpiCard } from "@/ui/kpi/KpiCard";
import { KpiGrid } from "@/ui/kpi/KpiGrid";
import { KpiRangePicker, type KpiRangeValue } from "@/ui/kpi/KpiRangePicker";
import { normalizeMerchantKpiRange, useMerchantKpi } from "@/features/merchantKpi/hooks";

const ALLOWED_ROLES: Role[] = ["merchant", "admin", "system"];

function hasAccess(roles: Role[] | undefined | null) {
  return (roles ?? []).some((role) => ALLOWED_ROLES.includes(role));
}

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrencyFromCents(cents?: number | null) {
  const value = Number(cents ?? 0) / 100;
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatInteger(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return value.toLocaleString();
}

function describeRange(start?: string, end?: string) {
  if (!start && !end) return "Range not set";
  if (start === end) return start ?? end ?? "Range not set";
  return `${start ?? "?"} → ${end ?? "?"}`;
}

function formatTimestamp(ts?: string) {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function MerchantKpiPage() {
  const { viewer } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rangeParam = searchParams.get("range");
  const range = normalizeMerchantKpiRange(rangeParam);

  React.useEffect(() => {
    if (rangeParam !== range) {
      const next = new URLSearchParams(searchParams);
      next.set("range", range);
      setSearchParams(next, { replace: true });
    }
  }, [rangeParam, range, searchParams, setSearchParams]);

  const allowed = hasAccess(viewer?.roles);

  const kpiQuery = useMerchantKpi(range, { enabled: allowed });
  const data = kpiQuery.data;
  const lastUpdated = formatTimestamp(data?.generated_at);

  const handleRangeChange = (next: KpiRangeValue) => {
    const normalized = normalizeMerchantKpiRange(String(next));
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("range", normalized);
    setSearchParams(nextParams, { replace: true });
  };

  if (!allowed) {
    return (
      <div className="p-6">
        <EmptyState
          title="Access restricted"
          description="You need a merchant role to view KPIs."
          icon={Shield}
          actions={
            <Button asChild>
              <Link to="/merchant">Back to merchant home</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Merchant KPI Dashboard</div>
          <div className="text-sm text-muted-foreground">Daily and weekly performance from the canonical API.</div>
        </div>
        <KpiRangePicker value={range} onValueChange={handleRangeChange} disabled={kpiQuery.isFetching && !kpiQuery.isError} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Store snapshot</CardTitle>
            <div className="text-sm text-muted-foreground">{data?.store?.name ?? "Loading store…"}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              {lastUpdated ? `Last updated ${lastUpdated}` : "Waiting for data…"}
            </div>
            <Button variant="outline" size="sm" onClick={() => kpiQuery.refetch()} disabled={kpiQuery.isFetching}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {kpiQuery.isFetching ? "Refreshing" : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Filters:</span> {describeRange(data?.filters?.start_date, data?.filters?.end_date)}
          </div>
          <div>
            <span className="font-medium text-foreground">Timezone:</span> {data?.filters?.timezone ?? "—"}
          </div>
        </CardContent>
      </Card>

      {kpiQuery.isLoading ? (
        <div className="space-y-4" aria-live="polite">
          <div className="text-sm text-muted-foreground">Loading KPI data…</div>
          <KpiGrid>
            {Array.from({ length: 4 }).map((_, idx) => (
              <KpiCard key={`s-${idx}`} title="Loading" loading />
            ))}
          </KpiGrid>
        </div>
      ) : kpiQuery.isError ? (
        <EmptyState
          title="Unable to load KPIs"
          description={(kpiQuery.error as Error)?.message ?? "Please retry."}
          actions={
            <Button onClick={() => kpiQuery.refetch()} disabled={kpiQuery.isFetching}>
              Try again
            </Button>
          }
        />
      ) : data ? (
        (() => {
          const { daily, weekly } = data;
          const hasSnapshots = !!daily && !!weekly;
          const isEmpty = hasSnapshots && daily.orders_total === 0 && weekly.orders_total === 0;

          if (isEmpty) {
            return (
              <EmptyState
                title="No orders yet"
                description="We could not find orders for this range. Try another range or come back later."
                actions={
                  <Button variant="secondary" onClick={() => handleRangeChange("7d")}>
                    View last 7 days
                  </Button>
                }
              />
            );
          }

          return (
            <div className="space-y-6">
              <section className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">Range</div>
                  <div className="text-base font-medium">{describeRange(daily.start_date, daily.end_date)}</div>
                </div>
                <KpiGrid>
                  <KpiCard title="Orders total" value={formatInteger(daily.orders_total)} subtitle="All orders created" />
                  <KpiCard title="Completed" value={formatInteger(daily.orders_completed)} subtitle="Delivered orders" />
                  <KpiCard title="Cancelled" value={formatInteger(daily.orders_cancelled)} subtitle="Orders that did not complete" />
                  <KpiCard title="Completion rate" value={formatPercent(daily.completion_rate)} subtitle="Completed vs total" />
                  <KpiCard title="Gross revenue" value={formatCurrencyFromCents(daily.gross_revenue_cents)} subtitle="Before platform fees" />
                  <KpiCard title="Net revenue" value={formatCurrencyFromCents(daily.net_revenue_cents)} subtitle="After platform fees" />
                </KpiGrid>
              </section>

              <section className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">Weekly rollup</div>
                  <div className="text-base font-medium">{describeRange(weekly.start_date, weekly.end_date)}</div>
                </div>
                <KpiGrid>
                  <KpiCard title="Orders total (7d)" value={formatInteger(weekly.orders_total)} />
                  <KpiCard title="Completed (7d)" value={formatInteger(weekly.orders_completed)} />
                  <KpiCard title="Cancelled (7d)" value={formatInteger(weekly.orders_cancelled)} />
                  <KpiCard title="Completion rate (7d)" value={formatPercent(weekly.completion_rate)} />
                  <KpiCard title="Gross revenue (7d)" value={formatCurrencyFromCents(weekly.gross_revenue_cents)} />
                  <KpiCard title="Net revenue (7d)" value={formatCurrencyFromCents(weekly.net_revenue_cents)} />
                </KpiGrid>
              </section>
            </div>
          );
        })()
      ) : null}
    </div>
  );
}
