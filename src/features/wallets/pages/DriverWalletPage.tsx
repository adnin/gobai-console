import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { useDriverWallet, useDriverWalletLedger } from "../hooks";
import { AlertTriangle, RefreshCcw, Wallet } from "lucide-react";

const numberFormatter = new Intl.NumberFormat("en-US");

function formatPoints(value?: number | null) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  return numberFormatter.format(numeric);
}

function formatSignedPoints(value: number | null | undefined) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  return numeric > 0 ? `+${formatPoints(numeric)}` : formatPoints(numeric);
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

export function DriverWalletPage() {
  const walletQuery = useDriverWallet();
  const ledgerQuery = useDriverWalletLedger();

  const transactions = ledgerQuery.data?.transactions ?? [];
  const showEmptyTransactions = !ledgerQuery.isLoading && !ledgerQuery.isError && transactions.length === 0;
  const refreshing = walletQuery.isFetching || ledgerQuery.isFetching;

  const handleRefresh = () => {
    void walletQuery.refetch();
    void ledgerQuery.refetch();
  };

  const belowMinimum = (() => {
    if (!walletQuery.data) return false;
    return walletQuery.data.balance_points < walletQuery.data.min_required_to_work;
  })();

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Driver Wallet</div>
          <div className="text-sm text-muted-foreground">Points available for accepting jobs and recent adjustments.</div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {walletQuery.isLoading ? (
              <div className="space-y-3">
                <div className="h-8 w-32 animate-pulse rounded-md bg-muted/60" />
                <div className="h-4 w-40 animate-pulse rounded-md bg-muted/40" />
                <div className="h-4 w-24 animate-pulse rounded-md bg-muted/30" />
              </div>
            ) : walletQuery.isError ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  {getErrorMessage(walletQuery.error, "Failed to load wallet data.")}
                </div>
                <Button size="sm" onClick={() => void walletQuery.refetch()} disabled={walletQuery.isFetching}>
                  Retry
                </Button>
              </div>
            ) : walletQuery.data ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Available points</div>
                  <div className="text-3xl font-semibold">{formatPoints(walletQuery.data.balance_points)}</div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="capitalize">
                    {walletQuery.data.status ?? "active"}
                  </Badge>
                  <div className="text-muted-foreground">Status</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
                  <div className="flex items-center justify-between font-medium">
                    <span>Minimum required to work</span>
                    <span>{formatPoints(walletQuery.data.min_required_to_work)}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Stay above this threshold to keep receiving offers.
                  </div>
                </div>
                {belowMinimum ? (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-400/60 bg-amber-50/80 p-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      Balance is below the required minimum. Finish cash-ins or payouts to recover points before accepting new jobs.
                    </div>
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
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" />
              Recent transactions
            </CardTitle>
            <div className="text-sm text-muted-foreground">Latest adjustments affecting your points balance.</div>
          </CardHeader>
          <CardContent>
            {ledgerQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="h-12 w-full animate-pulse rounded-md bg-muted/40" />
                ))}
              </div>
            ) : ledgerQuery.isError ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  {getErrorMessage(ledgerQuery.error, "Failed to load transactions.")}
                </div>
                <Button size="sm" onClick={() => void ledgerQuery.refetch()} disabled={ledgerQuery.isFetching}>
                  Retry
                </Button>
              </div>
            ) : showEmptyTransactions ? (
              <EmptyState
                title="No transactions yet"
                description="You will see completed deliveries, adjustments, and cash-ins here."
                actions={<Button size="sm" variant="secondary" onClick={handleRefresh}>Refresh</Button>}
              />
            ) : (
              <div className="overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">ID</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Points</th>
                      <th className="px-3 py-2 font-medium">Reference</th>
                      <th className="px-3 py-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 50).map((tx) => (
                      <tr key={tx.id} className="border-t border-border/60">
                        <td className="px-3 py-2 font-medium">{tx.id}</td>
                        <td className="px-3 py-2 capitalize">{tx.type ?? "—"}</td>
                        <td className="px-3 py-2 font-semibold">{formatSignedPoints(tx.points)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {tx.reference_type ? `${tx.reference_type}#${tx.reference_id ?? "?"}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">{tx.created_at ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
