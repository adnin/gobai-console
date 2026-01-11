import * as React from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  adminAssignDriverToPartner,
  adminAssignStoreToPartner,
  adminGetPartnerSummary,
  adminGetPartnerWallet,
  adminListPartnerDrivers,
  adminListPartnerStores,
  adminListPartnerWalletTransactions,
  adminUnassignDriver,
  adminUnassignStore,
  listStores,
  type PartnerDriverRow,
  type PartnerStoreRow,
  type PartnerWalletTx,
} from "../api/adminPartnerApi";
import { useOpsDrivers } from "@/features/dispatch/hooks/useOpsDrivers";

function moneyPts(n: number) {
  const v = Number(n ?? 0);
  return v.toLocaleString();
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "ok" && "border-emerald-600/30 bg-emerald-600/10",
        tone === "warn" && "border-amber-600/30 bg-amber-600/10",
        tone === "neutral" && "bg-white"
      )}
    >
      {children}
    </span>
  );
}

export default function AdminPartnerDetailPage() {
  const { partnerUserId } = useParams();
  const pid = Number(partnerUserId);
  const { token } = useAuth();
  const qc = useQueryClient();

  const [tab, setTab] = React.useState<"overview" | "wallet" | "drivers" | "stores">("overview");
  const [toast, setToast] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const summaryQ = useQuery({
    queryKey: ["admin-partner-summary", pid],
    queryFn: async () => adminGetPartnerSummary(token!, pid),
    enabled: !!token && Number.isFinite(pid) && pid > 0,
    refetchInterval: tab === "overview" ? 15000 : false,
  });

  const walletQ = useQuery({
    queryKey: ["admin-partner-wallet", pid],
    queryFn: async () => adminGetPartnerWallet(token!, pid),
    enabled: !!token && Number.isFinite(pid) && pid > 0,
    refetchInterval: tab === "wallet" ? 15000 : false,
  });

  const [txPage, setTxPage] = React.useState(1);
  const txQ = useQuery({
    queryKey: ["admin-partner-wallet-tx", pid, txPage],
    queryFn: async () => adminListPartnerWalletTransactions(token!, pid, { page: txPage, per_page: 25 }),
    enabled: !!token && Number.isFinite(pid) && pid > 0 && tab === "wallet",
    keepPreviousData: true,
  });

  const driversQ = useQuery({
    queryKey: ["admin-partner-drivers", pid],
    queryFn: async () => adminListPartnerDrivers(token!, pid),
    enabled: !!token && Number.isFinite(pid) && pid > 0 && tab === "drivers",
  });

  const storesQ = useQuery({
    queryKey: ["admin-partner-stores", pid],
    queryFn: async () => adminListPartnerStores(token!, pid),
    enabled: !!token && Number.isFinite(pid) && pid > 0 && tab === "stores",
  });

  // pickers
  const [driverQ, setDriverQ] = React.useState("");
  const opsDriversQ = useOpsDrivers({ q: driverQ });
  const [storeQ, setStoreQ] = React.useState("");
  const allStoresQ = useQuery({
    queryKey: ["admin-all-stores"],
    queryFn: async () => listStores(token!),
    enabled: !!token && tab === "stores",
  });

  const assignDriverM = useMutation({
    mutationFn: async (driverUserId: number) => adminAssignDriverToPartner(token!, pid, driverUserId),
    onSuccess: async () => {
      setToast({ kind: "ok", text: "Driver assigned." });
      await qc.invalidateQueries({ queryKey: ["admin-partner-drivers", pid] });
      await qc.invalidateQueries({ queryKey: ["ops-drivers"] });
    },
    onError: (e: any) => setToast({ kind: "err", text: e?.message ?? "Assign failed." }),
  });

  const unassignDriverM = useMutation({
    mutationFn: async (driverUserId: number) => adminUnassignDriver(token!, driverUserId),
    onSuccess: async () => {
      setToast({ kind: "ok", text: "Driver unassigned." });
      await qc.invalidateQueries({ queryKey: ["admin-partner-drivers", pid] });
      await qc.invalidateQueries({ queryKey: ["ops-drivers"] });
    },
    onError: (e: any) => setToast({ kind: "err", text: e?.message ?? "Unassign failed." }),
  });

  const assignStoreM = useMutation({
    mutationFn: async (storeId: number) => adminAssignStoreToPartner(token!, pid, storeId),
    onSuccess: async () => {
      setToast({ kind: "ok", text: "Store assigned." });
      await qc.invalidateQueries({ queryKey: ["admin-partner-stores", pid] });
    },
    onError: (e: any) => setToast({ kind: "err", text: e?.message ?? "Assign failed." }),
  });

  const unassignStoreM = useMutation({
    mutationFn: async (storeId: number) => adminUnassignStore(token!, storeId),
    onSuccess: async () => {
      setToast({ kind: "ok", text: "Store unassigned." });
      await qc.invalidateQueries({ queryKey: ["admin-partner-stores", pid] });
    },
    onError: (e: any) => setToast({ kind: "err", text: e?.message ?? "Unassign failed." }),
  });

  const summary = summaryQ.data?.data;
  const wallet = walletQ.data?.data;
  const txRows = (txQ.data?.data ?? []) as PartnerWalletTx[];
  const txMeta = txQ.data?.meta;
  const driverRows = (driversQ.data?.data ?? []) as PartnerDriverRow[];
  const storeRows = (storesQ.data?.data ?? []) as PartnerStoreRow[];

  const storesAll = allStoresQ.data ?? [];
  const storeFiltered = React.useMemo(() => {
    const q = storeQ.trim().toLowerCase();
    if (!q) return storesAll;
    return storesAll.filter((s) => String(s.name ?? "").toLowerCase().includes(q) || String(s.address ?? "").toLowerCase().includes(q) || String(s.id).includes(q));
  }, [storesAll, storeQ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Partner management</div>
          <h1 className="text-xl font-semibold">Partner #{pid}</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant={tab === "overview" ? "default" : "secondary"} onClick={() => setTab("overview")}>Overview</Button>
          <Button variant={tab === "wallet" ? "default" : "secondary"} onClick={() => setTab("wallet")}>Wallet</Button>
          <Button variant={tab === "drivers" ? "default" : "secondary"} onClick={() => setTab("drivers")}>Drivers</Button>
          <Button variant={tab === "stores" ? "default" : "secondary"} onClick={() => setTab("stores")}>Stores</Button>
        </div>
      </div>

      {toast && (
        <div className={cn(
          "rounded-lg border p-3 text-sm",
          toast.kind === "ok" ? "border-emerald-600/30 bg-emerald-600/10" : "border-red-600/30 bg-red-600/10"
        )}>
          <div className="flex items-start justify-between gap-3">
            <div>{toast.text}</div>
            <button className="text-xs opacity-70 hover:opacity-100" onClick={() => setToast(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between">
                <div className="text-sm text-muted-foreground">Earnings</div>
                <div className="text-2xl font-semibold">{moneyPts(summary?.today.earnings_points ?? 0)}</div>
              </div>
              <div className="flex items-baseline justify-between">
                <div className="text-sm text-muted-foreground">Completed</div>
                <div className="text-lg font-semibold">{summary?.today.completed ?? 0}</div>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground">Auto-refreshes every 15s.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">This month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between">
                <div className="text-sm text-muted-foreground">Completed</div>
                <div className="text-2xl font-semibold">{summary?.month.completed ?? 0}</div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Pill tone="ok">Partner {summary?.month.current_partner_pct ?? 70}%</Pill>
                <Pill>System {summary?.month.current_system_pct ?? 30}%</Pill>
                <Pill tone="warn">Next order: {summary?.month.next_order_partner_pct ?? 70}% / {summary?.month.next_order_system_pct ?? 30}%</Pill>
              </div>
              <div className="text-xs text-muted-foreground">Tier range: {summary?.month.tier_label ?? "—"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="secondary" onClick={() => summaryQ.refetch()} disabled={summaryQ.isFetching}>Refresh KPIs</Button>
              <Button variant="secondary" onClick={() => walletQ.refetch()} disabled={walletQ.isFetching}>Refresh wallet</Button>
              <div className="text-xs text-muted-foreground">Use Drivers/Stores tabs to manage fleet scope.</div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "wallet" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-semibold">{moneyPts(wallet?.balance_points ?? 0)}</div>
              <div className="text-xs text-muted-foreground">Last update: {wallet?.updated_at ? new Date(wallet.updated_at).toLocaleString() : "—"}</div>
              <Separator />
              <div className="text-xs text-muted-foreground">Transactions auto-refresh while you are on this tab.</div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Transactions</CardTitle>
                <Button variant="secondary" onClick={() => txQ.refetch()} disabled={txQ.isFetching}>Refresh</Button>
              </div>
            </CardHeader>
            <CardContent>
              {txQ.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading transactions…</div>
              ) : txRows.length === 0 ? (
                <div className="text-sm text-muted-foreground">No transactions yet.</div>
              ) : (
                <div className="overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left">
                        <th className="px-3 py-2">When</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Points</th>
                        <th className="px-3 py-2">Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txRows.map((t) => (
                        <tr key={t.id} className="border-t">
                          <td className="px-3 py-2 whitespace-nowrap">{t.created_at ? new Date(t.created_at).toLocaleString() : "—"}</td>
                          <td className="px-3 py-2">{t.type}</td>
                          <td className="px-3 py-2 font-medium">{moneyPts(t.points)}</td>
                          <td className="px-3 py-2">{t.reference_id ? `#${t.reference_id}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Page {txMeta?.current_page ?? 1} / {txMeta?.last_page ?? 1} · Total {txMeta?.total ?? txRows.length}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setTxPage((p) => Math.max(1, p - 1))} disabled={(txMeta?.current_page ?? 1) <= 1}>Prev</Button>
                  <Button variant="secondary" onClick={() => setTxPage((p) => p + 1)} disabled={(txMeta?.current_page ?? 1) >= (txMeta?.last_page ?? 1)}>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "drivers" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Drivers under fleet</CardTitle>
                <Button variant="secondary" onClick={() => driversQ.refetch()} disabled={driversQ.isFetching}>Refresh</Button>
              </div>
            </CardHeader>
            <CardContent>
              {driversQ.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading drivers…</div>
              ) : driverRows.length === 0 ? (
                <div className="text-sm text-muted-foreground">No drivers assigned yet.</div>
              ) : (
                <div className="overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left">
                        <th className="px-3 py-2">Driver</th>
                        <th className="px-3 py-2">Contact</th>
                        <th className="px-3 py-2 w-[180px]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverRows.map((d) => (
                        <tr key={d.id} className="border-t">
                          <td className="px-3 py-2">
                            <div className="font-medium">{d.name ?? `User #${d.id}`}</div>
                            <div className="text-xs text-muted-foreground">Last seen: {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : "—"}</div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-xs">{d.mobile ?? ""}</div>
                            <div className="text-xs text-muted-foreground">{d.email ?? ""}</div>
                          </td>
                          <td className="px-3 py-2">
                            <Button variant="destructive" onClick={() => unassignDriverM.mutate(d.id)} disabled={unassignDriverM.isPending}>Unassign</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Assign driver</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input value={driverQ} onChange={(e) => setDriverQ(e.target.value)} placeholder="Search drivers…" />
              <div className="text-xs text-muted-foreground">Pick from Ops driver list. Assigning sets driver.partner_user_id.</div>
              <Separator />
              {opsDriversQ.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="max-h-[360px] overflow-auto rounded-lg border">
                  {(opsDriversQ.data ?? []).slice(0, 30).map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 border-b p-2 last:border-b-0">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{d.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {d.mobile ?? ""} {d.status ? `· ${d.status}` : ""}
                        </div>
                      </div>
                      <Button onClick={() => assignDriverM.mutate(Number(d.id))} disabled={assignDriverM.isPending}>Assign</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "stores" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Stores under fleet</CardTitle>
                <Button variant="secondary" onClick={() => storesQ.refetch()} disabled={storesQ.isFetching}>Refresh</Button>
              </div>
            </CardHeader>
            <CardContent>
              {storesQ.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading stores…</div>
              ) : storeRows.length === 0 ? (
                <div className="text-sm text-muted-foreground">No stores assigned yet.</div>
              ) : (
                <div className="overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left">
                        <th className="px-3 py-2">Store</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 w-[180px]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storeRows.map((s) => (
                        <tr key={s.id} className="border-t">
                          <td className="px-3 py-2">
                            <div className="font-medium">{s.name ?? `Store #${s.id}`}</div>
                            <div className="text-xs text-muted-foreground">{s.address ?? ""}</div>
                          </td>
                          <td className="px-3 py-2">
                            <Pill>{s.approval_status ?? "—"}</Pill>
                          </td>
                          <td className="px-3 py-2">
                            <Button variant="destructive" onClick={() => unassignStoreM.mutate(s.id)} disabled={unassignStoreM.isPending}>Unassign</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Assign store</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input value={storeQ} onChange={(e) => setStoreQ(e.target.value)} placeholder="Search stores…" />
              <div className="text-xs text-muted-foreground">Assigning a store sets store.partner_user_id so orders auto-tag.</div>
              <Separator />
              {allStoresQ.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="max-h-[360px] overflow-auto rounded-lg border">
                  {storeFiltered.slice(0, 30).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 border-b p-2 last:border-b-0">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{s.name ?? `Store #${s.id}`}</div>
                        <div className="truncate text-xs text-muted-foreground">{s.address ?? ""}</div>
                      </div>
                      <Button onClick={() => assignStoreM.mutate(Number(s.id))} disabled={assignStoreM.isPending}>Assign</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
