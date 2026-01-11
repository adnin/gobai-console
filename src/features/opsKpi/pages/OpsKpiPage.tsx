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
import {
  normalizeOpsKpiRange,
  resolveOpsRangeDates,
  useOpsFraud,
  useOpsInventory,
  useOpsOverview,
  useOpsParcelCod,
} from "../hooks";

const OPS_ROLES: Role[] = ["ops", "admin", "system"];

function hasAccess(roles: Role[] | undefined | null) {
  return (roles ?? []).some((role) => OPS_ROLES.includes(role));
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
  if (typeof value !== "number" || Number.isNaN(value)) return "0";
  return value.toLocaleString();
}

function describeWindow(start?: string, end?: string, days?: number) {
  if (!start && !end) return "Range not set";
  const label = start === end ? start ?? end ?? "Range not set" : `${start ?? "?"} → ${end ?? "?"}`;
  if (days) return `${label} (${days}d)`;
  return label;
}

export function OpsKpiPage() {
  const { viewer } = useAuth();
  const allowed = hasAccess(viewer?.roles);
  const [searchParams, setSearchParams] = useSearchParams();
  const rangeParam = searchParams.get("range");
  const range = normalizeOpsKpiRange(rangeParam);

  React.useEffect(() => {
    if (rangeParam !== range) {
      const next = new URLSearchParams(searchParams);
      next.set("range", range);
      setSearchParams(next, { replace: true });
    }
  }, [rangeParam, range, searchParams, setSearchParams]);

  const { startDate, endDate } = React.useMemo(() => resolveOpsRangeDates(range), [range]);

  const overviewQuery = useOpsOverview(range, allowed);
  const inventoryQuery = useOpsInventory(range, allowed, undefined);
  const parcelCodQuery = useOpsParcelCod(allowed);
  const fraudQuery = useOpsFraud(range, allowed);

  const isLoading = overviewQuery.isLoading && !overviewQuery.data;
  const hasError = overviewQuery.isError || inventoryQuery.isError || parcelCodQuery.isError || fraudQuery.isError;
  const firstError =
    (overviewQuery.error as Error | undefined)?.message ||
    (inventoryQuery.error as Error | undefined)?.message ||
    (parcelCodQuery.error as Error | undefined)?.message ||
    (fraudQuery.error as Error | undefined)?.message;

  const data = overviewQuery.data;
  const inventory = inventoryQuery.data;
  const parcelCod = parcelCodQuery.data;
  const fraud = fraudQuery.data;

  const isEmpty = data && data.orders.total === 0;

  const [refreshing, setRefreshing] = React.useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      overviewQuery.refetch(),
      inventoryQuery.refetch(),
      parcelCodQuery.refetch(),
      fraudQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const handleRangeChange = (next: KpiRangeValue) => {
    const normalized = normalizeOpsKpiRange(String(next));
    const params = new URLSearchParams(searchParams);
    params.set("range", normalized);
    setSearchParams(params, { replace: true });
  };

  if (!allowed) {
    return (
      <div className="p-6">
        <EmptyState
          title="Access restricted"
          description="You need an ops/admin role to view ops KPIs."
          icon={Shield}
          actions={
            <Button asChild>
              <Link to="/ops/dispatch">Go to Ops Dispatch</Link>
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
            <div className="text-2xl font-semibold">Ops KPI Dashboard</div>
            <div className="text-sm text-muted-foreground">Monitoring overview for orders, drivers, and risk.</div>
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
          title="Unable to load ops KPIs"
          description={firstError || "Please retry."}
          icon={AlertTriangle}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleRefresh()} disabled={refreshing}>
                {refreshing ? "Retrying…" : "Try again"}
              </Button>
              <Button asChild variant="secondary">
                <Link to="/ops/dispatch">Go to Ops Dispatch</Link>
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
            <div className="text-2xl font-semibold">Ops KPI Dashboard</div>
            <div className="text-sm text-muted-foreground">Monitoring overview for orders, drivers, and risk.</div>
          </div>
          <KpiRangePicker value={range} onValueChange={handleRangeChange} />
        </div>
        <div className="mt-6">
          <EmptyState
            title="No ops activity for this window"
            description="We could not find orders for the selected range. Try a longer window."
            icon={BarChart3}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => handleRangeChange("7d")}>View last 7 days</Button>
                <Button asChild>
                  <Link to="/ops/dispatch">Open Ops Dispatch</Link>
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Ops KPI Dashboard</div>
          <div className="text-sm text-muted-foreground">Live operations pulse with order, driver, inventory, and risk signals.</div>
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
            <CardTitle className="text-base">Window</CardTitle>
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
            <KpiCard
              title="Revenue"
              value={formatCurrency(data.finance.revenue_total)}
              subtitle="Total price sum"
            />
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
            <CardTitle className="text-base">Inventory health</CardTitle>
            <div className="text-sm text-muted-foreground">Out-of-stock and low-stock counts by store.</div>
          </CardHeader>
          <CardContent>
            {inventoryQuery.isLoading && !inventory ? (
              <KpiGrid>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <KpiCard key={`inv-${idx}`} title="Loading" loading />
                ))}
              </KpiGrid>
            ) : inventory ? (
              <div className="space-y-3">
                <KpiGrid>
                  <KpiCard title="Products" value={formatNumber(inventory.totals.total_products)} subtitle="Total tracked SKUs" />
                  <KpiCard title="Out of stock" value={formatNumber(inventory.totals.out_of_stock)} subtitle="Unavailable right now" />
                  <KpiCard
                    title="Low stock"
                    value={formatNumber(inventory.totals.low_stock)}
                    subtitle={`Threshold ≤ ${inventory.threshold.low_stock}`}
                  />
                </KpiGrid>
                {inventory.stores.length > 0 ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Stores with issues</div>
                    <div className="space-y-1">
                      {inventory.stores.slice(0, 5).map((store) => (
                        <div key={store.store_id} className="flex items-center justify-between gap-2">
                          <div className="truncate font-medium text-foreground">{store.store_name ?? `Store #${store.store_id}`}</div>
                          <div className="text-xs text-muted-foreground">
                            OOS {formatNumber(store.out_of_stock)} · Low {formatNumber(store.low_stock)}
                          </div>
                        </div>
                      ))}
                      {inventory.stores.length > 5 ? (
                        <div className="text-xs text-muted-foreground">+{inventory.stores.length - 5} more stores</div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No inventory issues detected for this window.</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Inventory data unavailable.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-1">
            <CardTitle className="text-base">Parcel COD risk</CardTitle>
            <div className="text-sm text-muted-foreground">Outstanding cash collection and remittance.</div>
          </CardHeader>
          <CardContent>
            {parcelCodQuery.isLoading && !parcelCod ? (
              <KpiGrid>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <KpiCard key={`cod-${idx}`} title="Loading" loading />
                ))}
              </KpiGrid>
            ) : parcelCod ? (
              <KpiGrid>
                <KpiCard
                  title="Outstanding (points)"
                  value={formatNumber(parcelCod.outstanding_total)}
                  subtitle="Driver COD wallet balance"
                />
                <KpiCard
                  title="Drivers with balance"
                  value={formatNumber(parcelCod.drivers_with_outstanding)}
                  subtitle="Must remit"
                />
                <KpiCard
                  title="Orders overdue"
                  value={formatNumber(parcelCod.orders_overdue)}
                  subtitle={`Overdue > ${parcelCod.grace_hours}h`}
                  deltaLabel={`To collect: ${formatNumber(parcelCod.orders_to_collect)}`}
                  deltaTrend="up"
                />
              </KpiGrid>
            ) : (
              <div className="text-sm text-muted-foreground">Parcel COD data unavailable.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-1">
          <CardTitle className="text-base">Fraud & audit signals</CardTitle>
          <div className="text-sm text-muted-foreground">Rule-based signals to investigate quickly.</div>
        </CardHeader>
        <CardContent>
          {fraudQuery.isLoading && !fraud ? (
            <KpiGrid>
              {Array.from({ length: 2 }).map((_, idx) => (
                <KpiCard key={`fraud-${idx}`} title="Loading" loading />
              ))}
            </KpiGrid>
          ) : fraud ? (
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-sm font-semibold">High-cancel customers</div>
                <div className="mt-2 space-y-2 text-sm">
                  {fraud.signals.high_cancellation_customers.length > 0 ? (
                    fraud.signals.high_cancellation_customers.slice(0, 5).map((cust) => (
                      <div key={cust.customer_id} className="rounded-md border border-border bg-card px-3 py-2">
                        <div className="font-medium text-foreground">{cust.name ?? `Customer #${cust.customer_id}`}</div>
                        <div className="text-xs text-muted-foreground">{cust.email ?? "Email not set"}</div>
                        <div className="text-xs text-amber-600">Cancels: {formatNumber(cust.cancelled_count)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No cancellation clusters detected.</div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-sm font-semibold">Wallet adjustments</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border border-border bg-card p-3">
                    <div className="text-xs text-muted-foreground">Driver wallet adjustments</div>
                    <div className="text-lg font-semibold">{formatNumber(fraud.signals.wallet_adjustments.driver_wallet_adjustments)}</div>
                  </div>
                  <div className="rounded-md border border-border bg-card p-3">
                    <div className="text-xs text-muted-foreground">Reward wallet adjustments</div>
                    <div className="text-lg font-semibold">{formatNumber(fraud.signals.wallet_adjustments.reward_wallet_adjustments)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-sm font-semibold">Refund-related audit actions</div>
                <div className="mt-2 text-3xl font-semibold text-foreground">
                  {formatNumber(fraud.signals.audit_refund_related_actions)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Audit events containing refund keywords.</div>
                <div className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{fraud.note}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Fraud signals unavailable.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
