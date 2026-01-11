import * as React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { adminCashins, adminCashinsApprove, adminCashinsReject } from "@/features/admin/api/adminApi";

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

export function AdminCashinsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const [status, setStatus] = React.useState<"submitted" | "approved" | "rejected">("submitted");
  const [q, setQ] = React.useState<string>("");

  const listQ = useQuery({
    queryKey: ["admin", "cashins", status],
    queryFn: async () => adminCashins(String(token), { status }),
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  const approveM = useMutation({
    mutationFn: async (id: number) => adminCashinsApprove(String(token), id),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin", "cashins"] }),
  });

  const rejectM = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => adminCashinsReject(String(token), id, reason),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin", "cashins"] }),
  });

  const rows: any[] = Array.isArray((listQ.data as any)?.data) ? (listQ.data as any).data : Array.isArray((listQ.data as any)?.data?.data) ? (listQ.data as any).data.data : [];

  const filtered = rows.filter((r: any) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    const hay = [r?.id, r?.user?.name, r?.user?.email, r?.user?.mobile, r?.reference_no].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(needle);
  });

  const busy = approveM.isPending || rejectM.isPending;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Wallet Cash-ins</h1>
          <div className="text-sm text-muted-foreground">Approve top-up requests (credits points to the target wallet).</div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm"><Link to="/admin">Back</Link></Button>
          <StatusPill active={status === "submitted"} onClick={() => setStatus("submitted")}>Submitted</StatusPill>
          <StatusPill active={status === "approved"} onClick={() => setStatus("approved")}>Approved</StatusPill>
          <StatusPill active={status === "rejected"} onClick={() => setStatus("rejected")}>Rejected</StatusPill>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Requests</CardTitle>
            <div className="flex items-center gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: user, ref, id…" className="w-full sm:w-80" />
              <Button variant="secondary" onClick={() => listQ.refetch()} disabled={listQ.isFetching}>{listQ.isFetching ? "Refreshing…" : "Refresh"}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {listQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No requests found.</div>
          ) : (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr className="text-left">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Wallet</th>
                    <th className="px-3 py-2">Points</th>
                    <th className="px-3 py-2 hidden md:table-cell">Created</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 w-[220px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any) => {
                    const st = String(r?.status ?? status).toLowerCase();
                    return (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{r.id}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{r?.user?.name ?? `User #${r?.user_id ?? "—"}`}</div>
                          <div className="text-xs text-muted-foreground">{r?.user?.email ?? ""}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-xs text-muted-foreground">{String(r?.wallet_kind ?? r?.wallet_type ?? "—")}</div>
                          <div className="text-xs text-muted-foreground">wallet_id: {String(r?.wallet_id ?? "—")}</div>
                        </td>
                        <td className="px-3 py-2"><Badge variant="secondary">{Number(r?.amount_points ?? r?.points ?? 0).toLocaleString()} pts</Badge></td>
                        <td className="px-3 py-2 hidden md:table-cell">{String(r?.created_at ?? "—")}</td>
                        <td className="px-3 py-2">{st.toUpperCase()}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            {st === "submitted" ? (
                              <>
                                <Button size="sm" onClick={() => approveM.mutate(r.id)} disabled={busy}>Approve</Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    const reason = (prompt("Reject reason (required):") ?? "").trim();
                                    if (!reason) return;
                                    rejectM.mutate({ id: r.id, reason });
                                  }}
                                  disabled={busy}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
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

          {(listQ.isError || approveM.isError || rejectM.isError) && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              {(listQ.error as any)?.message ?? (approveM.error as any)?.message ?? (rejectM.error as any)?.message ?? "Request failed"}
            </div>
          )}

          <Separator className="my-3" />
          <div className="text-xs text-muted-foreground">
            Note: Cash-in approval is idempotent; repeated clicks should not double-credit points.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
