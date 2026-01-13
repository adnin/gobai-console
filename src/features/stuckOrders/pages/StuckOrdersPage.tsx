import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, Filter, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth";
import { hasAnyRole, type Role } from "@/lib/rbac";
import { getErrorMessage } from "@/lib/apiError";
import { useStuckOrders } from "../hooks";
import { parseAgeMinutes, type StuckOrder } from "../types";

const OPS_ROLES: Role[] = ["ops", "admin", "system"];

const TIME_WINDOWS = [
  { label: "Any time", value: "any", minutes: null },
  { label: "≤ 15 min", value: "15", minutes: 15 },
  { label: "≤ 30 min", value: "30", minutes: 30 },
  { label: "≤ 60 min", value: "60", minutes: 60 },
  { label: "≤ 120 min", value: "120", minutes: 120 },
];

const LIMIT_OPTIONS = [25, 50, 100];

export function StuckOrdersPage() {
  const { viewer } = useAuth();
  const allowed = hasAnyRole(viewer, OPS_ROLES);
  const [reasonFilter, setReasonFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState(TIME_WINDOWS[0].value);
  const [limit, setLimit] = useState(LIMIT_OPTIONS[2]);

  const query = useStuckOrders({ limit }, allowed);
  const orders = query.data?.data ?? [];

  const reasonOptions = useMemo(() => {
    const list = Array.from(new Set(orders.map((o) => o.reason_code))).filter(Boolean);
    return list.sort();
  }, [orders]);

  const statusOptions = useMemo(() => {
    const list = Array.from(new Set(orders.map((o) => o.status))).filter(Boolean);
    return list.sort();
  }, [orders]);

  const timeWindow = useMemo(() => TIME_WINDOWS.find((w) => w.value === timeFilter) ?? TIME_WINDOWS[0], [timeFilter]);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      if (reasonFilter !== "all" && order.reason_code !== reasonFilter) return false;
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (timeWindow.minutes !== null) {
        const age = parseAgeMinutes(order.age_minutes);
        if (age === null || age > timeWindow.minutes) return false;
      }
      return true;
    });
  }, [orders, reasonFilter, statusFilter, timeWindow.minutes]);

  const isUnauthorized = query.error && (query.error as any)?.status === 403;
  const isError = query.isError && !isUnauthorized;
  const errorMessage = isError ? getErrorMessage(query.error, "Unable to load stuck orders") : null;

  const handleReset = () => {
    setReasonFilter("all");
    setStatusFilter("all");
    setTimeFilter(TIME_WINDOWS[0].value);
  };

  if (!allowed) {
    return (
      <div className="p-6">
        <EmptyState
          title="Access restricted"
          description="You need ops/admin access to view stuck orders."
          icon={AlertTriangle}
          actions={
            <Button asChild>
              <a href="/login">Sign in</a>
            </Button>
          }
        />
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="p-6">
        <EmptyState
          title="Not permitted"
          description="Your role cannot view stuck orders."
          icon={AlertTriangle}
          actions={
            <Button asChild variant="secondary">
              <a href="/ops">Go to Ops dashboard</a>
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
          <div className="text-2xl font-semibold">Stuck orders</div>
          <div className="text-sm text-muted-foreground">Investigate blocked orders and jump to their timelines.</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">limit={limit}</Badge>
          <Badge variant="outline">{filtered.length} shown</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Filters</CardTitle>
            <div className="text-sm text-muted-foreground">Reason, order status, and age window.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {query.isFetching ? "Refreshing…" : "Refresh"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reason
              <Select value={reasonFilter} onChange={(event) => setReasonFilter(event.target.value)}>
                <option value="all">All reasons</option>
                {reasonOptions.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Any status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Time window
              <Select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value)}>
                {TIME_WINDOWS.map((window) => (
                  <option key={window.value} value={window.value}>
                    {window.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Limit
              <Select
                value={String(limit)}
                onChange={(event) => setLimit(Number(event.target.value) || LIMIT_OPTIONS[0])}
              >
                {LIMIT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <EmptyState
          title="Could not load stuck orders"
          description={errorMessage ?? "Please retry."}
          icon={AlertTriangle}
          actions={
            <Button size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              Retry
            </Button>
          }
        />
      ) : null}

      {query.isLoading && !query.data ? <LoadingList /> : null}

      {!query.isLoading && filtered.length === 0 && !isError ? (
        <EmptyState
          title="No stuck orders match"
          description="Try expanding the filters or wait for new stuck signals."
          icon={Filter}
          actions={
            <Button size="sm" variant="secondary" onClick={handleReset}>
              Clear filters
            </Button>
          }
        />
      ) : null}

      <div className="space-y-3">
        {filtered.map((order) => (
          <StuckOrderCard key={order.order_id} order={order} />
        ))}
      </div>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="rounded-2xl border border-border bg-card/60 p-4">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="mt-3 h-3 w-full rounded bg-muted" />
          <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function StuckOrderCard({ order }: { order: StuckOrder }) {
  const age = parseAgeMinutes(order.age_minutes);
  const lastUpdate = order.last_event_at ? new Date(order.last_event_at).toLocaleString() : "—";

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Order #{order.order_id}</div>
          <div className="text-xs text-muted-foreground">Ref {order.reference_no}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{order.status}</Badge>
          <Badge variant="secondary">{order.dispatch_status}</Badge>
          <Badge variant={reasonVariant(order.reason_code)}>{order.reason_code}</Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Reason</div>
          <div className="text-sm font-medium">{order.reason}</div>
          <div className="mt-1 text-xs text-muted-foreground">{order.recommended_action}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Customer</div>
          {order.customer ? (
            <div className="text-sm">
              <div className="font-medium">{order.customer.name}</div>
              <div className="text-muted-foreground">{order.customer.mobile}</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">n/a</div>
          )}
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Driver / Store</div>
          <div className="text-sm">
            {order.driver ? (
              <div>
                <span className="font-medium">Driver:</span> {order.driver.name}
              </div>
            ) : (
              <div className="text-muted-foreground">No driver</div>
            )}
            {order.store ? (
              <div>
                <span className="font-medium">Store:</span> {order.store.name}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          <span>Last update: {lastUpdate}</span>
          <span>· Age: {age !== null ? `${age} min` : order.age_minutes}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to={`/admin/orders/${order.order_id}/timeline`}>View timeline</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/ops/explain-stuck">Explain stuck</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function reasonVariant(reason: string): "secondary" | "warning" | "danger" {
  const normalized = reason.toLowerCase();
  if (normalized.includes("driver") || normalized.includes("dispatch")) return "warning";
  if (normalized.includes("payment") || normalized.includes("cancel")) return "danger";
  return "secondary";
}
