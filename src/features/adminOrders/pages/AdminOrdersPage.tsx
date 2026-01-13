import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, RefreshCw, Shield, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/rbac";
import { useAdminOrders } from "../hooks";
import type { AdminOrder, AdminOrderFilters, AdminOrderStatus } from "../types";

const STATUSES: AdminOrderStatus[] = [
  "pending",
  "pending_payment",
  "accepted",
  "arrived",
  "picked_up",
  "in_transit",
  "delivered",
  "completed",
  "cancelled",
];

const ALLOWED_ROLES: Role[] = ["admin", "ops", "system"];

function hasAccess(roles: Role[] | undefined | null) {
  return (roles ?? []).some((r) => ALLOWED_ROLES.includes(r));
}

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function useFiltersFromSearchParams(): [AdminOrderFilters, (next: AdminOrderFilters) => void] {
  const [params, setParams] = useSearchParams();

  const filters = React.useMemo<AdminOrderFilters>(() => {
    return {
      order_id: parseNumber(params.get("order_id")),
      customer_phone: params.get("customer_phone") || null,
      customer_email: params.get("customer_email") || null,
      driver_id: parseNumber(params.get("driver_id")),
      store_id: parseNumber(params.get("store_id")),
      status: (params.get("status") as AdminOrderStatus | null) || null,
      page: parseNumber(params.get("page")) || 1,
      per_page: parseNumber(params.get("per_page")) || 20,
    };
  }, [params]);

  const setFilters = React.useCallback(
    (next: AdminOrderFilters) => {
      const nextParams = new URLSearchParams();
      const set = (key: string, value: string | number | null | undefined) => {
        if (value === null || value === undefined || value === "") return;
        nextParams.set(key, String(value));
      };
      set("order_id", next.order_id);
      set("customer_phone", next.customer_phone?.trim());
      set("customer_email", next.customer_email?.trim());
      set("driver_id", next.driver_id);
      set("store_id", next.store_id);
      set("status", next.status);
      set("page", next.page ?? 1);
      set("per_page", next.per_page ?? 20);
      setParams(nextParams, { replace: true });
    },
    [setParams]
  );

  return [filters, setFilters];
}

function StatusBadge({ status }: { status: string }) {
  const color = (() => {
    switch (status) {
      case "completed":
      case "delivered":
        return "success";
      case "cancelled":
        return "destructive";
      case "in_transit":
      case "picked_up":
        return "default";
      default:
        return "secondary";
    }
  })();
  return <Badge variant={color as any}>{status.replace(/_/g, " ")}</Badge>;
}

export function AdminOrdersPage() {
  const { viewer } = useAuth();
  const allowed = hasAccess(viewer?.roles);
  const [filters, setFilters] = useFiltersFromSearchParams();
  const ordersQuery = useAdminOrders(filters, allowed);
  const data = ordersQuery.data;
  const orders = (data?.data ?? []) as AdminOrder[];
  const meta = data?.meta ?? {};
  const total = meta.total ?? orders.length;
  const page = meta.current_page ?? meta.page ?? filters.page ?? 1;
  const perPage = meta.per_page ?? filters.per_page ?? 20;
  const lastPage = meta.last_page ?? Math.max(1, Math.ceil(total / perPage));

  const [form, setForm] = React.useState<AdminOrderFilters>(() => filters);

  React.useEffect(() => {
    setForm(filters);
  }, [filters]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFilters({ ...form, page: 1 });
  };

  const handleReset = () => {
    setFilters({ page: 1, per_page: 20 });
  };

  const handlePageChange = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(lastPage, nextPage));
    setFilters({ ...filters, page: clamped });
  };

  const isUnauthorized = ordersQuery.error && (ordersQuery.error as any)?.status === 403;

  if (!allowed) {
    return (
      <div className="p-6">
        <EmptyState
          title="Access restricted"
          description="You need admin or ops access to search orders."
          icon={Shield}
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
          description="Your role cannot access admin order search."
          icon={Shield}
          actions={
            <Button asChild>
              <a href="/ops">Go to Ops Dispatch</a>
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
          <div className="text-2xl font-semibold">Order Search</div>
          <div className="text-sm text-muted-foreground">Admin/Ops search with deterministic ordering (newest first).</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">per_page={perPage}</Badge>
          <Badge variant="outline">page={page}</Badge>
          <Badge variant="outline">sorted=id desc</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Filters</CardTitle>
            <div className="text-sm text-muted-foreground">Order ID, customer contact, driver/store, status.</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {ordersQuery.isFetching ? <span>Refreshing…</span> : <span>Last loaded</span>}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Order ID"
              value={form.order_id ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, order_id: parseNumber(e.target.value) }))}
            />
            <Input
              placeholder="Customer phone"
              value={form.customer_phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))}
            />
            <Input
              type="email"
              placeholder="Customer email"
              value={form.customer_email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
            />
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Driver ID"
              value={form.driver_id ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, driver_id: parseNumber(e.target.value) }))}
            />
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Store ID"
              value={form.store_id ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, store_id: parseNumber(e.target.value) }))}
            />
            <Select
              value={form.status ?? ""}
              onChange={(event) =>
                setForm((f) => ({ ...f, status: (event.target.value as AdminOrderStatus) || null }))
              }
            >
              <option value="">Any status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </Select>

            <div className="flex items-center gap-2 md:col-span-3">
              <Button type="submit" disabled={ordersQuery.isFetching}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              <Button type="button" variant="secondary" onClick={handleReset} disabled={ordersQuery.isFetching}>
                Reset
              </Button>
              <Button type="button" variant="outline" onClick={() => ordersQuery.refetch()} disabled={ordersQuery.isFetching}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <span className="text-xs text-muted-foreground">Newest first · deterministic id desc</span>
            </div>
          </form>
        </CardContent>
      </Card>

      {ordersQuery.isLoading ? (
        <Card aria-busy>
          <CardContent className="space-y-3 p-4">
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="h-10 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : ordersQuery.isError ? (
        <EmptyState
          title="Unable to load orders"
          description={(ordersQuery.error as Error)?.message ?? "Please retry."}
          icon={Ban}
          actions={
            <Button onClick={() => ordersQuery.refetch()} disabled={ordersQuery.isFetching}>
              Try again
            </Button>
          }
        />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Try different filters or widen the search."
          icon={Search}
          actions={
            <Button variant="secondary" onClick={handleReset}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Results</CardTitle>
            <div className="text-sm text-muted-foreground">{total} result(s)</div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2">Ref</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Customer</th>
                  <th className="px-2 py-2">Driver</th>
                  <th className="px-2 py-2">Store</th>
                  <th className="px-2 py-2">Created</th>
                  <th className="px-2 py-2">Signals</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: AdminOrder) => (
                  <tr key={order.id} className="border-t border-border hover:bg-accent/40">
                    <td className="px-2 py-2 font-semibold text-foreground">{order.id}</td>
                    <td className="px-2 py-2">{order.reference_no || "—"}</td>
                    <td className="px-2 py-2"><StatusBadge status={order.status} /></td>
                    <td className="px-2 py-2">{order.customer?.mobile || order.customer?.email || "—"}</td>
                    <td className="px-2 py-2">{order.driver?.name || (order.driver_id ? `#${order.driver_id}` : "—")}</td>
                    <td className="px-2 py-2">{order.store?.name || (order.store_id ? `Store #${order.store_id}` : "—")}</td>
                    <td className="px-2 py-2 text-muted-foreground">{formatDate(order.created_at)}</td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {order.driver_signals ? <Badge variant="outline">signal</Badge> : "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/admin/orders/${order.id}/timeline`}>Timeline</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">Showing page {page} of {lastPage}</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1 || ordersQuery.isFetching} onClick={() => handlePageChange(page - 1)}>
                  Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= lastPage || ordersQuery.isFetching} onClick={() => handlePageChange(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
