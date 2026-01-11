import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { financeAdjust, financeCustomerBalances, FinanceAdjustPayload } from "@/features/finance/api/financeApi";

export function FinanceWalletsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const [qText, setQText] = useState<string>("");
  const [minBalance, setMinBalance] = useState<string>("");

  const params = useMemo(
    () => ({ q: qText || undefined, min_balance: minBalance ? Number(minBalance) : undefined, per_page: 25 }),
    [qText, minBalance]
  );

  const q = useQuery({
    queryKey: ["finance", "customerBalances", params],
    queryFn: async () => financeCustomerBalances(String(token), params),
    enabled: !!token,
  });

  const rows = q.data?.data ?? [];

  // Manual adjust form
  const [userId, setUserId] = useState<string>("");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [points, setPoints] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const payload: FinanceAdjustPayload | null = useMemo(() => {
    const uid = Number(userId);
    const pts = Number(points);
    if (!Number.isFinite(uid) || uid <= 0) return null;
    if (!Number.isFinite(pts) || pts <= 0) return null;
    if (reason.trim().length < 2) return null;
    return { wallet: "customer", direction, user_id: uid, points: pts, reason: reason.trim() };
  }, [userId, points, direction, reason]);

  const m = useMutation({
    mutationFn: async () => financeAdjust(String(token), payload as FinanceAdjustPayload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["finance", "customerBalances"] });
      setPoints("");
      setReason("");
    },
  });

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Customer Wallets</div>
          <div className="text-sm text-muted-foreground">Balances + manual adjustments (customer wallets only in MVP).</div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link to="/finance">Finance Home</Link>
          </Button>
          <Button onClick={() => q.refetch()} variant="secondary" disabled={q.isFetching}>
            {q.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <div className="mb-1 text-xs text-muted-foreground">Query</div>
                <Input value={qText} onChange={(e) => setQText(e.target.value)} placeholder="name / email / mobile" />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Min balance</div>
                <Input value={minBalance} onChange={(e) => setMinBalance(e.target.value)} placeholder="e.g. 100" />
              </div>
            </div>

            <Separator className="my-4" />

            <div className="overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Wallet</th>
                    <th className="px-3 py-2">Balance</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.wallet?.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.customer?.name ?? `#${r.wallet?.user_id}`}</div>
                        <div className="text-xs text-muted-foreground">{r.customer?.email ?? r.customer?.mobile ?? "—"}</div>
                      </td>
                      <td className="px-3 py-2">#{r.wallet?.id}</td>
                      <td className="px-3 py-2 font-semibold">{Number(r.wallet?.balance_points ?? 0).toLocaleString()}</td>
                      <td className="px-3 py-2">{r.wallet?.status ?? "—"}</td>
                      <td className="px-3 py-2">{r.wallet?.updated_at ?? "—"}</td>
                    </tr>
                  ))}
                  {!q.isLoading && rows.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                        No wallets found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {q.isError && (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                Failed to load balances. {(q.error as any)?.message ?? ""}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual Adjustment</CardTitle>
            <div className="text-sm text-muted-foreground">Use for incident fixes. Adds an audit log.</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">User ID</div>
                <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="e.g. 123" />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Direction</div>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as any)}
                >
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                </select>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Points</div>
                <Input value={points} onChange={(e) => setPoints(e.target.value)} placeholder="e.g. 50" />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Reason</div>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ticket / dispute / incident" />
              </div>

              <Button
                onClick={() => m.mutate()}
                disabled={!payload || m.isPending}
                className="w-full"
              >
                {m.isPending ? "Applying…" : "Apply"}
              </Button>

              {m.isError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  {(m.error as any)?.message ?? "Adjustment failed"}
                </div>
              )}
              {m.isSuccess && (
                <div className="rounded-lg border border-emerald-600/30 bg-emerald-600/10 p-3 text-sm">
                  Adjustment applied.
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                MVP note: transactions endpoint is not wired yet in the API. For deep investigations, use DB/audit logs.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
