import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, RefreshCcw, Search, User } from "lucide-react";
import { useAdminDriverWallet, useAdminDriverWalletLedger } from "../hooks";
import type { DriverWalletTransaction, PaginatedMeta, PaginatedPayload } from "../types";

const numberFormatter = new Intl.NumberFormat("en-US");

function formatPoints(value?: number | null) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  return numberFormatter.format(numeric);
}

function formatSignedPoints(value?: number | null) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  if (numeric > 0) return `+${formatPoints(numeric)}`;
  return formatPoints(numeric);
}

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function extractTransactions(
  payload?: PaginatedPayload<DriverWalletTransaction> | DriverWalletTransaction[]
): DriverWalletTransaction[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  // Some Laravel resources wrap data inside { data: { data, meta } }
  if (Array.isArray((payload as any)?.data?.data)) {
    return (payload as any).data.data as DriverWalletTransaction[];
  }
  return [];
}

function extractMeta(payload?: PaginatedPayload<DriverWalletTransaction>): PaginatedMeta {
  if (!payload) return {};
  if (payload.meta) return payload.meta;
  return {
    current_page: payload.current_page,
    last_page: payload.last_page,
    per_page: payload.per_page,
    total: payload.total,
  };
}

export function AdminDriverWalletPage() {
  const [driverInput, setDriverInput] = React.useState("");
  const [activeDriverId, setActiveDriverId] = React.useState<number | null>(null);
  const [page, setPage] = React.useState(1);
  const [formError, setFormError] = React.useState<string | null>(null);

  const walletQuery = useAdminDriverWallet(activeDriverId);
  const ledgerQuery = useAdminDriverWalletLedger(activeDriverId, page);

  const hasSelection = typeof activeDriverId === "number" && activeDriverId > 0;
  const transactions = extractTransactions(ledgerQuery.data?.transactions);
  const txMeta = extractMeta(ledgerQuery.data?.transactions);
  const noTransactions = hasSelection && !ledgerQuery.isLoading && !ledgerQuery.isError && transactions.length === 0;
  const refreshing = walletQuery.isFetching || ledgerQuery.isFetching;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = driverInput.trim();
    const nextId = Number(trimmed);
    if (!trimmed.length || !Number.isFinite(nextId) || nextId <= 0) {
      setFormError("Enter a valid driver user ID (positive integer).");
      return;
    }
    setFormError(null);
    setActiveDriverId(nextId);
    setPage(1);
  };

  const handleReset = () => {
    setDriverInput("");
    setFormError(null);
    setActiveDriverId(null);
    setPage(1);
  };

  const handleRefresh = () => {
    if (!hasSelection) return;
    void walletQuery.refetch();
    void ledgerQuery.refetch();
  };

  const driver = walletQuery.data?.driver;
  const wallet = walletQuery.data?.wallet;

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" /> Driver wallet lookup
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Search by driver user ID to view wallet balance and ledger. IDs are available from the Drivers page.
          </div>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSubmit}>
            <div className="flex-1">
              <div className="mb-1 text-xs text-muted-foreground">Driver user ID</div>
              <Input
                value={driverInput}
                onChange={(e) => setDriverInput(e.target.value)}
                placeholder="e.g. 1024"
                inputMode="numeric"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Lookup</Button>
              <Button type="button" variant="secondary" onClick={handleReset} disabled={!driverInput && !hasSelection}>
                Clear
              </Button>
            </div>
          </form>
          {formError ? (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">{formError}</div>
          ) : null}
        </CardContent>
      </Card>

      {!hasSelection ? (
        <EmptyState
          title="Find a driver wallet"
          description="Enter a driver user ID above to load their wallet snapshot and most recent transactions."
          icon={User}
          actions={
            <Button variant="secondary" onClick={() => setDriverInput("1")}>Example ID</Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Driver snapshot</CardTitle>
                <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                  {refreshing ? "Refreshing…" : "Refresh"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {walletQuery.isLoading ? (
                <div className="space-y-3">
                  <div className="h-5 w-32 animate-pulse rounded bg-muted/60" />
                  <div className="h-4 w-48 animate-pulse rounded bg-muted/40" />
                  <div className="h-4 w-36 animate-pulse rounded bg-muted/30" />
                </div>
              ) : walletQuery.isError ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                    {(walletQuery.error as any)?.message ?? "Failed to load driver wallet."}
                  </div>
                  <Button size="sm" onClick={() => walletQuery.refetch()} disabled={walletQuery.isFetching}>
                    Retry
                  </Button>
                </div>
              ) : walletQuery.data ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Driver</div>
                    <div className="text-lg font-semibold">{driver?.name ?? `User #${driver?.id}`}</div>
                    <div className="text-xs text-muted-foreground">{driver?.email ?? "—"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="secondary">#{driver?.id}</Badge>
                    <Badge variant="secondary" className="capitalize">{driver?.status ?? "unknown"}</Badge>
                    <Badge variant="secondary" className="capitalize">{wallet?.status ?? "wallet"}</Badge>
                  </div>
                  <Separator />
                  <div>
                    <div className="text-xs text-muted-foreground">Balance</div>
                    <div className="text-3xl font-semibold">{formatPoints(wallet?.balance_points)}</div>
                    <div className="text-xs text-muted-foreground">Use Refresh to pull the latest balance snapshot.</div>
                  </div>
                  {wallet?.status && wallet.status !== "active" ? (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-400/60 bg-amber-50/80 p-3 text-sm text-amber-900">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>Wallet status is {wallet.status}. Verify trust rules or pending incidents before topping up.</div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No wallet data yet.</div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent transactions</CardTitle>
                <Button variant="secondary" size="sm" onClick={() => ledgerQuery.refetch()} disabled={ledgerQuery.isFetching}>
                  {ledgerQuery.isFetching ? "Refreshing…" : "Refresh"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ledgerQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="h-12 w-full animate-pulse rounded bg-muted/40" />
                  ))}
                </div>
              ) : ledgerQuery.isError ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                    {(ledgerQuery.error as any)?.message ?? "Failed to load transactions."}
                  </div>
                  <Button size="sm" onClick={() => ledgerQuery.refetch()} disabled={ledgerQuery.isFetching}>
                    Retry
                  </Button>
                </div>
              ) : noTransactions ? (
                <EmptyState
                  title="No transactions yet"
                  description="Completed deliveries, adjustments, and payouts will show up here."
                  actions={<Button variant="secondary" onClick={() => ledgerQuery.refetch()}>Refresh</Button>}
                />
              ) : (
                <>
                  <div className="overflow-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">When</th>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Points</th>
                          <th className="px-3 py-2 font-medium">Reference</th>
                          <th className="px-3 py-2 font-medium">Meta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="border-t border-border/60">
                            <td className="px-3 py-2 whitespace-nowrap text-xs">{formatTimestamp(tx.created_at)}</td>
                            <td className="px-3 py-2 capitalize">{tx.type ?? "—"}</td>
                            <td className="px-3 py-2 font-semibold">{formatSignedPoints(tx.points)}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {tx.reference_type ? `${tx.reference_type}#${tx.reference_id ?? "?"}` : "—"}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {tx.meta ? JSON.stringify(tx.meta).slice(0, 80) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div>
                      Page {txMeta.current_page ?? 1} / {txMeta.last_page ?? 1} · Total {txMeta.total ?? transactions.length}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={(txMeta.current_page ?? 1) <= 1 || ledgerQuery.isFetching}
                      >
                        Prev
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPage((prev) => prev + 1)}
                        disabled={(txMeta.current_page ?? 1) >= (txMeta.last_page ?? 1) || ledgerQuery.isFetching}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
