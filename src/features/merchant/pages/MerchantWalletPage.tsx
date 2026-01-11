import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { merchantWallet, merchantWalletLedger } from "@/features/merchant/api/merchantApi";
import { MerchantTabs } from "@/features/merchant/components/MerchantTabs";

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v.toLocaleString() : "0";
}

export function MerchantWalletPage() {
  const { token } = useAuth();

  const w = useQuery({
    queryKey: ["merchant", "wallet"],
    queryFn: async () => merchantWallet(String(token)),
    enabled: !!token,
    refetchInterval: 15_000,
  });

  const ledger = useQuery({
    queryKey: ["merchant", "wallet", "ledger"],
    queryFn: async () => merchantWalletLedger(String(token)),
    enabled: !!token,
  });

  const rows = ledger.data?.data ?? ledger.data?.data?.data ?? ledger.data ?? [];

  return (
    <div className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Wallet</div>
          <div className="text-sm text-muted-foreground">Available + held points (held is blocked by trust rules).</div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm"><Link to="/merchant">Orders</Link></Button>
          <Button variant="secondary" size="sm" onClick={() => { w.refetch(); ledger.refetch(); }} disabled={w.isFetching || ledger.isFetching}>
            {w.isFetching || ledger.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <MerchantTabs />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Available</span><span className="font-semibold">{n(w.data?.available_points)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Held</span><span className="font-semibold">{n(w.data?.held_points)}</span></div>
            <Separator />
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Status</span><span className="font-semibold">{String(w.data?.status ?? "—")}</span></div>
            {w.isError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">{(w.error as any)?.message ?? "Failed to load wallet"}</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ledger</CardTitle>
            <div className="text-sm text-muted-foreground">Most recent 100 transactions.</div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Points</th>
                    <th className="px-3 py-2">Meta</th>
                    <th className="px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{r.id}</td>
                      <td className="px-3 py-2">{String(r.type ?? r.transaction_type ?? "—")}</td>
                      <td className="px-3 py-2 font-semibold">{n(r.points ?? r.amount_points ?? r.amount ?? 0)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.meta ? JSON.stringify(r.meta).slice(0, 80) : "—"}</td>
                      <td className="px-3 py-2">{String(r.created_at ?? "—")}</td>
                    </tr>
                  ))}
                  {!ledger.isLoading && rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No transactions yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {ledger.isError && (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">{(ledger.error as any)?.message ?? "Failed to load ledger"}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 text-sm">
        Held points release automatically when: no open dispute, OTP/PIN satisfied, and other trust gates pass.
      </div>
    </div>
  );
}
