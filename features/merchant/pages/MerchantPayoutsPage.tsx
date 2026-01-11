import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { merchantPayouts, merchantRequestPayout } from "@/features/merchant/api/merchantApi";
import { MerchantTabs } from "@/features/merchant/components/MerchantTabs";

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v : 0;
}

export function MerchantPayoutsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const payouts = useQuery({
    queryKey: ["merchant", "payouts"],
    queryFn: async () => merchantPayouts(String(token), { per_page: 30 }),
    enabled: !!token,
    refetchInterval: 15_000,
  });

  const balance = payouts.data?.balance_points ?? payouts.data?.data?.balance_points ?? 0;
  const rows = payouts.data?.data?.data ?? payouts.data?.data ?? payouts.data?.data?.data?.data ?? [];

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"gcash" | "bank">("gcash");
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");

  const requestM = useMutation({
    mutationFn: async () =>
      merchantRequestPayout(String(token), {
        amount: n(amount),
        payout_method: method,
        payout_account: account.trim(),
        payout_name: name.trim() || null,
        idempotency_key: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())) + ":merchant_cashout",
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "payouts"] });
      setAmount("");
      setAccount("");
      setName("");
    },
  });

  const canRequest = n(amount) > 0 && account.trim().length >= 5;

  const limits = useMemo(
    () => ({
      max_per_day_count: 3,
      max_per_day_amount: 8000,
      max_per_tx: 5000,
      cooldown_seconds: 120,
    }),
    []
  );

  return (
    <div className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Payouts</div>
          <div className="text-sm text-muted-foreground">Request cashout (strict limits; idempotent).</div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm"><Link to="/merchant">Orders</Link></Button>
          <Button variant="secondary" size="sm" onClick={() => payouts.refetch()} disabled={payouts.isFetching}>
            {payouts.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <MerchantTabs />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Balance</span><span className="font-semibold">{n(balance).toLocaleString()}</span></div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              Limits: {limits.max_per_tx} max/tx, {limits.max_per_day_count} requests/day, {limits.max_per_day_amount} amount/day.
            </div>
            <div className="text-xs text-muted-foreground">
              Cooldown: {limits.cooldown_seconds}s between requests.
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Request payout</CardTitle>
            <div className="text-sm text-muted-foreground">Balance will be held instantly (amount + fee).</div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Amount</div>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1500" />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Method</div>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                >
                  <option value="gcash">GCash</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Account</div>
                <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder={method === "gcash" ? "09xxxxxxxxx" : "Bank acct #"} />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Name (optional)</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account holder" />
              </div>
            </div>

            <Button className="mt-3" onClick={() => requestM.mutate()} disabled={!canRequest || requestM.isPending}>
              {requestM.isPending ? "Submitting…" : "Request payout"}
            </Button>

            {requestM.isError && (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                {(requestM.error as any)?.message ?? "Payout request failed"}
              </div>
            )}

            <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              Tip: use the same idempotency key only when retrying the same request (e.g. after network drop).
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Fee</th>
                  <th className="px-3 py-2">Destination</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{r.id}</td>
                    <td className="px-3 py-2">{String(r.status ?? "—")}</td>
                    <td className="px-3 py-2 font-semibold">{n(r.amount_points).toLocaleString()}</td>
                    <td className="px-3 py-2">{n(r.fee_points).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {String(r.destination_type ?? "")} {String(r.destination_account ?? "")}
                    </td>
                    <td className="px-3 py-2">{String(r.created_at ?? "—")}</td>
                  </tr>
                ))}
                {!payouts.isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No payout requests yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {payouts.isError && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              {(payouts.error as any)?.message ?? "Failed to load payouts"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
