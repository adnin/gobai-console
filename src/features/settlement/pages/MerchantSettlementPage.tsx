import { AlertTriangle, Banknote, Clock, RefreshCcw, ShieldOff, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MerchantTabs } from "@/features/merchant/components/MerchantTabs";
import { useMerchantSettlementSummary } from "@/features/settlement/hooks";
import type { SettlementHold } from "@/features/settlement/types";

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readStringField(hold: SettlementHold | null | undefined, fields: string[]): string | null {
  if (!hold) return null;
  for (const field of fields) {
    const raw = hold[field];
    if (typeof raw === "string" && raw.trim().length) {
      return raw.trim();
    }
  }
  return null;
}

function readNumberField(hold: SettlementHold | null | undefined, fields: string[]): number | null {
  if (!hold) return null;
  for (const field of fields) {
    const raw = hold[field];
    const value = toNumber(raw);
    if (value !== null) return value;
  }
  return null;
}

function formatMoneyFromCents(value: unknown): string {
  const cents = toNumber(value) ?? 0;
  return currencyFormatter.format(cents / 100);
}

function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  } catch {
    return value;
  }
}

function getHoldReason(hold: SettlementHold): string {
  return (
    readStringField(hold, ["reason", "reason_code", "status"]) ??
    "Pending release"
  );
}

function getHoldEta(hold: SettlementHold): string {
  return formatDate(readStringField(hold, ["eta", "release_eta", "release_at"]));
}

function getHoldCreatedAt(hold: SettlementHold): string {
  return formatDate(readStringField(hold, ["created_at", "started_at", "updated_at"]));
}

function getHoldStatus(hold: SettlementHold): string {
  return readStringField(hold, ["status", "state"]) ?? "on_hold";
}

function getHoldAmount(hold: SettlementHold): number {
  return (
    readNumberField(hold, ["amount_cents", "pending_cents", "amount", "amount_points"]) ?? 0
  );
}

function SummarySkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <Card key={idx} className={idx === 0 ? "lg:col-span-2" : undefined}>
          <CardHeader>
            <div className="h-4 w-24 animate-pulse rounded bg-muted/60" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-8 w-32 animate-pulse rounded bg-muted/70" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted/50" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MerchantSettlementPage() {
  const summaryQuery = useMerchantSettlementSummary();
  const refreshing = summaryQuery.isFetching;
  const summary = summaryQuery.data?.data;
  const holds = Array.isArray(summary?.holds) ? summary.holds : [];
  const totalHoldCents = holds.reduce((acc, hold) => acc + getHoldAmount(hold), 0);
  const hasPending = (summary?.summary?.pending_cents ?? 0) > 0;
  const isUnauthorized = summaryQuery.isError && summaryQuery.error?.status === 403;
  const showEmpty = !summaryQuery.isLoading && !summaryQuery.isError && !summary;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Settlement summary</div>
          <div className="text-sm text-muted-foreground">
            Earned, pending, and paid payouts with the current hold reasons and estimated release window.
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => summaryQuery.refetch()} disabled={refreshing}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <MerchantTabs />

      {summaryQuery.isLoading ? (
        <SummarySkeleton />
      ) : isUnauthorized ? (
        <EmptyState
          title="You do not have settlement access"
          description="Ask an admin to grant settlement permissions for your merchant account."
          icon={ShieldOff}
          actions={
            <Button variant="secondary" size="sm" onClick={() => summaryQuery.refetch()}>
              Retry
            </Button>
          }
        />
      ) : summaryQuery.isError ? (
        <EmptyState
          title="Failed to load settlement summary"
          description={summaryQuery.error?.message ?? "Please try again in a few seconds."}
          icon={AlertTriangle}
          actions={
            <Button size="sm" onClick={() => summaryQuery.refetch()} disabled={summaryQuery.isFetching}>
              Retry
            </Button>
          }
        />
      ) : showEmpty ? (
        <EmptyState
          title="No settlement data"
          description="Once orders start settling, this page will show payout totals and release gates."
          icon={Banknote}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <StoreIcon className="h-4 w-4" /> Store
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="text-lg font-semibold">{summary?.store?.name ?? "Store"}</div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">Store #{summary?.store?.id ?? "?"}</Badge>
                  <Badge variant="secondary">{holds.length} active holds</Badge>
                </div>
                <div className="rounded-lg border border-border bg-muted/10 p-3 text-xs text-muted-foreground">
                  Totals refresh automatically every payout cycle. Use Refresh for on-demand snapshots.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Earned to date</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {formatMoneyFromCents(summary?.summary?.earned_cents)}
                </div>
                <div className="text-sm text-muted-foreground">All completed orders</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending release</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {formatMoneyFromCents(summary?.summary?.pending_cents)}
                </div>
                <div className="text-sm text-muted-foreground">In trust or verification</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Paid out</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {formatMoneyFromCents(summary?.summary?.paid_cents)}
                </div>
                <div className="text-sm text-muted-foreground">Transferred to you</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" /> Next release window
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="text-2xl font-semibold">
                  {summary?.next_release_at ? formatDate(summary.next_release_at) : "—"}
                </div>
                <div className="text-muted-foreground">
                  Holds auto-release after disputes, PIN/OTP checks, and ledger reconciliation pass.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" /> Last reconciled
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="text-2xl font-semibold">
                  {summary?.last_reconciled_at ? formatDate(summary.last_reconciled_at) : "—"}
                </div>
                <div className="text-muted-foreground">
                  Reconciliations ensure wallet, orders, and payouts stay in sync.
                </div>
              </CardContent>
            </Card>
          </div>

          {hasPending ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50/80 p-4 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div>
                {formatMoneyFromCents(summary?.summary?.pending_cents)} is waiting for release. Review hold reasons
                below to know which trust gates must clear.
              </div>
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Hold reasons</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {holds.length} active · {formatMoneyFromCents(totalHoldCents)} on hold
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {holds.length === 0 ? (
                <EmptyState
                  title="No active holds"
                  description="Completed orders will release immediately once trust checks stay green."
                  icon={Banknote}
                />
              ) : (
                <div className="overflow-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Reason</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">ETA</th>
                        <th className="px-3 py-2 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holds.map((hold, idx) => {
                        const holdIdValue = hold["id"];
                        const rowKey =
                          typeof holdIdValue === "string" || typeof holdIdValue === "number"
                            ? String(holdIdValue)
                            : String(idx);
                        return (
                          <tr key={rowKey} className="border-t border-border/60">
                          <td className="px-3 py-2 font-medium">{getHoldReason(hold)}</td>
                          <td className="px-3 py-2 font-semibold">{formatMoneyFromCents(getHoldAmount(hold))}</td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary" className="capitalize text-xs">
                              {getHoldStatus(hold)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-xs">{getHoldEta(hold)}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{getHoldCreatedAt(hold)}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
