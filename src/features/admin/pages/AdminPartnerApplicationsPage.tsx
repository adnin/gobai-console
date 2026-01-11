import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  adminApprovePartnerApplication,
  adminAssignDriverToPartner,
  adminAssignStoreToPartner,
  adminListPartnerApplications,
  adminRejectPartnerApplication,
  adminUnassignDriver,
  listStores,
  type PartnerApplicationRow,
  type StoreRow,
} from "../api/adminPartnerApi";
import { opsListDrivers, type ApiDriverProfile } from "@/features/dispatch/api/opsApi";

function StatusPill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium",
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white/50 hover:bg-white border-slate-200 text-slate-700"
      )}
    >
      {children}
    </button>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center overflow-auto p-4">
        <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <div className="font-semibold">{title}</div>
            <button className="text-sm text-slate-600 hover:text-slate-900" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function MoneyPill({ points }: { points: number }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-slate-50 px-2.5 py-1 text-xs font-medium">
      {points.toLocaleString()} pts
    </span>
  );
}

export function AdminPartnerApplicationsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const [status, setStatus] = React.useState<"pending" | "approved" | "rejected">("pending");
  const [q, setQ] = React.useState<string>("");
  const [selected, setSelected] = React.useState<PartnerApplicationRow | null>(null);
  const [panel, setPanel] = React.useState<"details" | "drivers" | "stores">("details");

  const appsQ = useQuery({
    queryKey: ["admin-partner-applications", status],
    queryFn: async () => adminListPartnerApplications(token!, { status, page: 1, limit: 50 }),
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  const approveM = useMutation({
    mutationFn: async (id: number) => adminApprovePartnerApplication(token!, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-partner-applications"] });
    },
  });

  const rejectM = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) =>
      adminRejectPartnerApplication(token!, id, reason),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-partner-applications"] });
    },
  });

  const list = (appsQ.data?.data ?? []).filter((row) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    const hay = [
      row.business_name,
      row.facebook_page_url,
      row.service_area,
      row.user?.name,
      row.user?.email,
      row.user?.mobile,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Partner Applications</h1>
          <div className="text-sm text-muted-foreground">
            Review partner fleet applications, approve/reject, and assign drivers/stores.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill active={status === "pending"} onClick={() => setStatus("pending")}>
            Pending
          </StatusPill>
          <StatusPill active={status === "approved"} onClick={() => setStatus("approved")}>
            Approved
          </StatusPill>
          <StatusPill active={status === "rejected"} onClick={() => setStatus("rejected")}>
            Rejected
          </StatusPill>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Applications</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search: name, email, page, area…"
                className="w-full sm:w-80"
              />
              <Button variant="secondary" onClick={() => appsQ.refetch()} disabled={appsQ.isFetching}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {appsQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : list.length === 0 ? (
            <div className="text-sm text-muted-foreground">No applications found.</div>
          ) : (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr className="text-left">
                    <th className="px-3 py-2">Partner</th>
                    <th className="px-3 py-2">Business</th>
                    <th className="px-3 py-2 hidden md:table-cell">Service area</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 w-[220px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => {
                    const st = String(row.status ?? "").toLowerCase();
                    return (
                      <tr key={row.id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium">{row.user?.name ?? `User #${row.user_id}`}</div>
                          <div className="text-xs text-muted-foreground">{row.user?.email ?? ""}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{row.business_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[320px]">
                            {row.facebook_page_url ?? ""}
                          </div>
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell">
                          <div className="text-sm">{row.service_area ?? "—"}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                              st === "approved"
                                ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-900"
                                : st === "pending"
                                ? "border-amber-600/30 bg-amber-600/10 text-amber-900"
                                : "border-red-600/30 bg-red-600/10 text-red-900"
                            )}
                          >
                            {st.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => { setSelected(row); setPanel("details"); }}>
                              View
                            </Button>
                            {st === "approved" && (
                              <a
                                href={`/admin/partners/${row.user_id}`}
                                className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
                              >
                                Manage
                              </a>
                            )}
                            {st === "pending" && (
                              <>
                                <Button
                                  onClick={() => approveM.mutate(row.id)}
                                  disabled={approveM.isPending}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    const reason = prompt("Reject reason (optional):") ?? "";
                                    rejectM.mutate({ id: row.id, reason });
                                  }}
                                  disabled={rejectM.isPending}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Partner — ${selected.user?.name ?? `User #${selected.user_id}`}` : "Partner"}
      >
        {selected && (
          <PartnerDetailPanel
            row={selected}
            panel={panel}
            setPanel={setPanel}
            onClose={() => setSelected(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function PartnerDetailPanel({
  row,
  panel,
  setPanel,
  onClose,
}: {
  row: PartnerApplicationRow;
  panel: "details" | "drivers" | "stores";
  setPanel: (p: "details" | "drivers" | "stores") => void;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const partnerUserId = Number(row.user_id);

  const [toast, setToast] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const storesQ = useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => listStores(token!),
    enabled: !!token && panel === "stores",
    staleTime: 30_000,
  });

  const [driverQ, setDriverQ] = React.useState<string>("");
  const driversQ = useQuery({
    queryKey: ["admin-drivers", driverQ],
    queryFn: async () => opsListDrivers(token!, { q: driverQ, status: "approved" }),
    enabled: !!token && panel === "drivers",
    staleTime: 10_000,
  });

  const assignDriverM = useMutation({
    mutationFn: async (driverUserId: number) => adminAssignDriverToPartner(token!, partnerUserId, driverUserId),
    onSuccess: async () => {
      setToast({ kind: "ok", text: "Driver assigned to partner fleet." });
      await qc.invalidateQueries({ queryKey: ["admin-drivers"] });
    },
    onError: (e: any) => setToast({ kind: "err", text: String(e?.message ?? "Failed to assign driver") }),
  });

  const unassignDriverM = useMutation({
    mutationFn: async (driverUserId: number) => adminUnassignDriver(token!, driverUserId),
    onSuccess: async () => {
      setToast({ kind: "ok", text: "Driver unassigned." });
      await qc.invalidateQueries({ queryKey: ["admin-drivers"] });
    },
    onError: (e: any) => setToast({ kind: "err", text: String(e?.message ?? "Failed to unassign driver") }),
  });

  const assignStoreM = useMutation({
    mutationFn: async (storeId: number) => adminAssignStoreToPartner(token!, partnerUserId, storeId),
    onSuccess: async () => {
      setToast({ kind: "ok", text: "Store assigned to partner." });
      await qc.invalidateQueries({ queryKey: ["admin-stores"] });
    },
    onError: (e: any) => setToast({ kind: "err", text: String(e?.message ?? "Failed to assign store") }),
  });

  const drivers = (driversQ.data?.data ?? []) as ApiDriverProfile[];
  const stores = (storesQ.data ?? []) as StoreRow[];

  // Helpers: detect assignment based on driver.user.partner_user_id if present.
  function driverPartnerId(d: ApiDriverProfile): number {
    const v = (d as any)?.user?.partner_user_id;
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">User</div>
          <div className="font-medium">{row.user?.name ?? `User #${row.user_id}`}</div>
          <div className="text-sm text-muted-foreground">{row.user?.email ?? ""}</div>
          {row.user?.mobile && <div className="text-sm text-muted-foreground">{row.user.mobile}</div>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant={panel === "details" ? "default" : "secondary"} onClick={() => setPanel("details")}>
            Details
          </Button>
          <Button variant={panel === "drivers" ? "default" : "secondary"} onClick={() => setPanel("drivers")}>
            Drivers
          </Button>
          <Button variant={panel === "stores" ? "default" : "secondary"} onClick={() => setPanel("stores")}>
            Stores
          </Button>
        </div>
      </div>

      {toast && (
        <div
          className={cn(
            "rounded-lg border p-3 text-sm",
            toast.kind === "ok" ? "border-emerald-600/30 bg-emerald-600/10" : "border-red-600/30 bg-red-600/10"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>{toast.text}</div>
            <button className="text-xs opacity-70 hover:opacity-100" onClick={() => setToast(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {panel === "details" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application details</CardTitle>
            <div className="text-sm text-muted-foreground">
              Partner user id: <span className="font-medium">{partnerUserId}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Business name</div>
                <div className="font-medium">{row.business_name ?? "—"}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Service area</div>
                <div className="font-medium">{row.service_area ?? "—"}</div>
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Facebook page URL</div>
              <div className="font-medium break-all">{row.facebook_page_url ?? "—"}</div>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground">
              After approval, assign at least one driver to this partner so they can use partner dispatch.
              For orders to auto-tag and appear under partner, assign stores too.
            </div>

            <div className="flex flex-wrap gap-2">
              <a href="/partner/dispatch" target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "secondary" }), "inline-flex")}>
                Open partner dispatch (new tab)
              </a>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {panel === "drivers" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Assign drivers</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  value={driverQ}
                  onChange={(e) => setDriverQ(e.target.value)}
                  placeholder="Search drivers…"
                  className="w-full sm:w-72"
                />
                <Button variant="secondary" onClick={() => driversQ.refetch()} disabled={driversQ.isFetching}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {driversQ.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading drivers…</div>
            ) : drivers.length === 0 ? (
              <div className="text-sm text-muted-foreground">No drivers found.</div>
            ) : (
              <div className="overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="px-3 py-2">Driver</th>
                      <th className="px-3 py-2 hidden md:table-cell">Today</th>
                      <th className="px-3 py-2">Fleet</th>
                      <th className="px-3 py-2 w-[220px]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((d) => {
                      const u = d.user ?? ({} as any);
                      const isMine = driverPartnerId(d) === partnerUserId;
                      const currentFleet = driverPartnerId(d);
                      return (
                        <tr key={d.id} className="border-t">
                          <td className="px-3 py-2">
                            <div className="font-medium">{u?.name ?? `Driver #${d.user_id}`}</div>
                            <div className="text-xs text-muted-foreground">{u?.mobile ?? u?.email ?? ""}</div>
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Accepted</span>
                              <MoneyPill points={Number(d.stats?.accepted_today ?? 0)} />
                              <span className="text-xs text-muted-foreground">Completed</span>
                              <MoneyPill points={Number(d.stats?.completed_today ?? 0)} />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {isMine ? (
                              <span className="rounded-full border border-emerald-600/30 bg-emerald-600/10 px-2.5 py-1 text-xs font-medium">
                                This partner
                              </span>
                            ) : currentFleet > 0 ? (
                              <span className="rounded-full border bg-slate-50 px-2.5 py-1 text-xs">
                                Fleet #{currentFleet}
                              </span>
                            ) : (
                              <span className="rounded-full border bg-white px-2.5 py-1 text-xs text-slate-600">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                disabled={assignDriverM.isPending}
                                onClick={() => assignDriverM.mutate(Number(d.user_id))}
                              >
                                Assign
                              </Button>
                              {isMine && (
                                <Button
                                  variant="destructive"
                                  disabled={unassignDriverM.isPending}
                                  onClick={() => unassignDriverM.mutate(Number(d.user_id))}
                                >
                                  Unassign
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {panel === "stores" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assign stores</CardTitle>
            <div className="text-sm text-muted-foreground">
              Assigning a store auto-tags its orders with this partner so they appear in partner dispatch.
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {storesQ.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading stores…</div>
            ) : stores.length === 0 ? (
              <div className="text-sm text-muted-foreground">No stores found.</div>
            ) : (
              <div className="grid gap-2">
                {stores.map((s) => (
                  <div key={s.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{s.name ?? `Store #${s.id}`}</div>
                      <div className="text-xs text-muted-foreground">{s.address ?? ""}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {s.approval_status && (
                          <span className="rounded-full border bg-slate-50 px-2.5 py-1">{s.approval_status}</span>
                        )}
                        {s.pickup_place_id ? (
                          <span className="rounded-full border border-emerald-600/30 bg-emerald-600/10 px-2.5 py-1">pickup ok</span>
                        ) : (
                          <span className="rounded-full border border-amber-600/30 bg-amber-600/10 px-2.5 py-1">needs pickup</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button disabled={assignStoreM.isPending} onClick={() => assignStoreM.mutate(Number(s.id))}>
                        Assign store
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
