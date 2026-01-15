import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { AlertTriangle, Clock, Filter, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/ui/toast/ToastProvider";
import { useAuth } from "@/lib/auth";
import { envBool } from "@/lib/http";
import { hasAnyRole, type Role } from "@/lib/rbac";
import { getErrorMessage } from "@/lib/apiError";
import { opsExplainStuck, type OpsExplainStuckResponse } from "@/features/dispatch/api/opsApi";
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
const AI_EXPLAIN_ENABLED = envBool("VITE_ENABLE_OPS_AI_EXPLAIN", false);

type ExplainMutation = UseMutationResult<
  OpsExplainStuckResponse,
  unknown,
  { orderId: number; includeAi: boolean }
>;

export function StuckOrdersPage() {
  const { viewer, token } = useAuth();
  const toast = useToast();
  const allowed = hasAnyRole(viewer, OPS_ROLES);
  const [reasonFilter, setReasonFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState(TIME_WINDOWS[0].value);
  const [limit, setLimit] = useState(LIMIT_OPTIONS[2]);
  const [explainTarget, setExplainTarget] = useState<StuckOrder | null>(null);
  const [includeAiMeta, setIncludeAiMeta] = useState(true);

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
  const canExplainAi = allowed && AI_EXPLAIN_ENABLED;

  const explainMutation = useMutation<OpsExplainStuckResponse, unknown, { orderId: number; includeAi: boolean }>({
    mutationFn: async ({ orderId, includeAi }) => {
      if (!token) throw new Error("Not authenticated");
      return opsExplainStuck(String(token), { orderId, includeAi });
    },
    onSuccess: (data) => toast.ok(`AI explanation ready for order #${data.order_id}`),
    onError: (err) => toast.apiErr(err, "Could not get AI explanation"),
  });

  const handleReset = () => {
    setReasonFilter("all");
    setStatusFilter("all");
    setTimeFilter(TIME_WINDOWS[0].value);
  };

  const handleOpenExplain = (order: StuckOrder) => {
    setIncludeAiMeta(true);
    explainMutation.reset();
    setExplainTarget(order);
  };

  const handleCloseExplain = () => {
    if (explainMutation.isPending) return;
    setExplainTarget(null);
    explainMutation.reset();
  };

  const handleExplainConfirm = () => {
    if (!explainTarget || explainMutation.isPending) return;
    explainMutation.mutate({ orderId: explainTarget.order_id, includeAi: includeAiMeta });
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
          <StuckOrderCard
            key={order.order_id}
            order={order}
            onExplain={canExplainAi ? handleOpenExplain : undefined}
          />
        ))}
      </div>

      {canExplainAi ? (
        <ExplainStuckDialog
          order={explainTarget}
          isOpen={Boolean(explainTarget)}
          includeAi={includeAiMeta}
          onIncludeAiChange={setIncludeAiMeta}
          onClose={handleCloseExplain}
          onConfirm={handleExplainConfirm}
          mutation={explainMutation}
        />
      ) : null}
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

function StuckOrderCard({ order, onExplain }: { order: StuckOrder; onExplain?: (order: StuckOrder) => void }) {
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
          {onExplain ? (
            <Button size="sm" variant="secondary" onClick={() => onExplain(order)}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              AI explain
            </Button>
          ) : (
            <Button asChild size="sm" variant="secondary">
              <Link to="/ops/explain-stuck">Explain stuck</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ExplainStuckDialog({
  order,
  isOpen,
  includeAi,
  onIncludeAiChange,
  onClose,
  onConfirm,
  mutation,
}: {
  order: StuckOrder | null;
  isOpen: boolean;
  includeAi: boolean;
  onIncludeAiChange: (next: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
  mutation: ExplainMutation;
}) {
  if (!order || !isOpen) return null;

  const errorMessage = mutation.isError ? getErrorMessage(mutation.error, "AI explanation failed") : null;

  return (
    <Dialog isOpen={isOpen} onClose={() => (!mutation.isPending ? onClose() : null)}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <DialogTitle>AI explain stuck</DialogTitle>
        </div>
        <div className="text-sm text-muted-foreground">
          Send stuck order context to the diagnostics endpoint and get blockers plus recommended actions.
        </div>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-border bg-card/90 p-3">
            <div className="font-medium">Order #{order.order_id}</div>
            <div className="text-xs text-muted-foreground">{order.reason}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{order.status}</Badge>
              <Badge variant="secondary">{order.dispatch_status}</Badge>
              <Badge variant={reasonVariant(order.reason_code)}>{order.reason_code}</Badge>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[color:var(--primary)]"
              checked={includeAi}
              onChange={(event) => onIncludeAiChange(event.target.checked)}
            />
            Include AI metadata (model + tokens)
          </label>
          <div className="text-xs text-muted-foreground">
            Calls /ops/orders/{order.order_id}/ai/explain-stuck{includeAi ? "?include_ai=1" : "?include_ai=0"}.
          </div>

          {mutation.isPending ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Asking AI for diagnostics…
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {mutation.data ? <AiExplanationDetails result={mutation.data} /> : null}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
          Close
        </Button>
        <Button onClick={onConfirm} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing…
            </span>
          ) : mutation.data ? (
            "Run again"
          ) : (
            "Request explanation"
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function AiExplanationDetails({ result }: { result: OpsExplainStuckResponse }) {
  const blockers = result.state_machine?.blockers ?? [];
  const actions = result.suggested_next_actions ?? [];

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI summary</div>
        <div className="mt-1 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          {result.explanation ?? "No summary returned."}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {result.state_machine?.current_state ? (
          <Badge variant="outline">State {result.state_machine.current_state}</Badge>
        ) : null}
        {result.rid ? <Badge variant="outline">RID {result.rid}</Badge> : null}
        {result.ai_meta?.model ? <Badge variant="secondary">{String(result.ai_meta.model)}</Badge> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card/80 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blockers</div>
          <div className="mt-2 space-y-2">
            {blockers.length === 0 ? (
              <div className="text-xs text-muted-foreground">No blockers reported.</div>
            ) : (
              blockers.map((blocker, idx) => (
                <div key={`${blocker.code ?? "blocker"}-${idx}`} className="rounded-md border border-border bg-background/80 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{blocker.code ?? "blocker"}</div>
                    {blocker.severity ? <Badge variant="warning">{blocker.severity}</Badge> : null}
                  </div>
                  {blocker.details ? (
                    <div className="mt-1 text-xs text-muted-foreground">{blocker.details}</div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card/80 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested actions</div>
          <div className="mt-2 space-y-2">
            {actions.length === 0 ? (
              <div className="text-xs text-muted-foreground">No actions suggested.</div>
            ) : (
              actions.map((action, idx) => (
                <div key={`${action.action ?? "action"}-${idx}`} className="rounded-md border border-border bg-background/80 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{action.action ?? "action"}</div>
                    {action.priority ? <Badge variant="outline">{action.priority}</Badge> : null}
                  </div>
                  {action.payload ? (
                    <pre className="mt-2 overflow-auto rounded-md bg-muted/30 p-2 text-xs font-mono">
                      {JSON.stringify(action.payload, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            )}
          </div>
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
