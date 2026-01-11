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
import {
  adminReceiptShow,
  adminReceipts,
  adminReceiptsApprove,
  adminReceiptsReject,
} from "@/features/admin/api/adminApi";

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
        <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
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

export function AdminReceiptsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const [status, setStatus] = React.useState<"pending" | "approved" | "rejected">("pending");
  const [q, setQ] = React.useState<string>("");
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  const listQ = useQuery({
    queryKey: ["admin", "receipts", status],
    queryFn: async () => adminReceipts(String(token), { status, page: 1, per_page: 50 }),
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  const detailQ = useQuery({
    queryKey: ["admin", "receipt", selectedId],
    queryFn: async () => adminReceiptShow(String(token), Number(selectedId)),
    enabled: !!token && !!selectedId,
  });

  const approveM = useMutation({
    mutationFn: async (id: number) => adminReceiptsApprove(String(token), id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "receipts"] });
      setSelectedId(null);
    },
  });

  const rejectM = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => adminReceiptsReject(String(token), id, reason),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "receipts"] });
      setSelectedId(null);
    },
  });

  const paginator = (listQ.data as any)?.data;
  const rows: any[] = Array.isArray(paginator?.data) ? paginator.data : [];

  const filtered = rows.filter((r: any) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    const hay = [r?.id, r?.order_id, r?.amount, r?.provider, r?.review_status, r?.user?.name, r?.user?.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });

  const busy = approveM.isPending || rejectM.isPending;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Payment Receipts</h1>
          <div className="text-sm text-muted-foreground">Review uploaded receipts and approve/reject them.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm"><Link to="/admin">Back</Link></Button>
          <StatusPill active={status === "pending"} onClick={() => setStatus("pending")}>Pending</StatusPill>
          <StatusPill active={status === "approved"} onClick={() => setStatus("approved")}>Approved</StatusPill>
          <StatusPill active={status === "rejected"} onClick={() => setStatus("rejected")}>Rejected</StatusPill>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Receipts</CardTitle>
            <div className="flex items-center gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: order, amount, user…" className="w-full sm:w-80" />
              <Button variant="secondary" onClick={() => listQ.refetch()} disabled={listQ.isFetching}>{listQ.isFetching ? "Refreshing…" : "Refresh"}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {listQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No receipts found.</div>
          ) : (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr className="text-left">
                    <th className="px-3 py-2">Receipt</th>
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2 hidden md:table-cell">User</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 w-[160px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any) => {
                    const st = String(r?.review_status ?? status).toLowerCase();
                    const img = r?.image_url ?? r?.photo_url ?? r?.receipt_url;
                    return (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {img ? (
                              <img src={img} alt="receipt" className="h-10 w-10 rounded-md border object-cover" />
                            ) : (
                              <div className="h-10 w-10 rounded-md border bg-muted" />
                            )}
                            <div>
                              <div className="font-medium">#{r.id}</div>
                              <div className="text-xs text-muted-foreground">{String(r?.provider ?? "—")}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">#{String(r?.order_id ?? "—")}</div>
                          <div className="text-xs text-muted-foreground">{String(r?.created_at ?? "—")}</div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary">{Number(r?.amount ?? r?.amount_points ?? 0).toLocaleString()}</Badge>
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell">
                          <div className="font-medium">{r?.user?.name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{r?.user?.email ?? ""}</div>
                        </td>
                        <td className="px-3 py-2">{st.toUpperCase()}</td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="secondary" onClick={() => setSelectedId(r.id)}>View</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {(listQ.isError || approveM.isError || rejectM.isError || detailQ.isError) && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              {(listQ.error as any)?.message ??
                (detailQ.error as any)?.message ??
                (approveM.error as any)?.message ??
                (rejectM.error as any)?.message ??
                "Request failed"}
            </div>
          )}

          <Separator className="my-3" />
          <div className="text-xs text-muted-foreground">
            Approving a receipt marks the related order payment as verified. Rejecting allows resubmission.
          </div>
        </CardContent>
      </Card>

      <Modal open={!!selectedId} onClose={() => setSelectedId(null)} title={`Receipt #${selectedId ?? ""}`}>
        {detailQ.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-3">
            {(() => {
              const receipt = (detailQ.data as any)?.receipt ?? (detailQ.data as any)?.data?.receipt ?? (detailQ.data as any)?.data ?? (detailQ.data as any);
              const st = String(receipt?.review_status ?? "").toLowerCase();
              const img = receipt?.image_url ?? receipt?.photo_url ?? receipt?.receipt_url;

              return (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="md:col-span-1">
                      {img ? (
                        <img src={img} alt="receipt" className="w-full rounded-xl border object-contain bg-white" />
                      ) : (
                        <div className="h-48 w-full rounded-xl border bg-muted" />
                      )}
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <div className="text-sm"><span className="text-muted-foreground">Order:</span> <span className="font-medium">#{String(receipt?.order_id ?? "—")}</span></div>
                      <div className="text-sm"><span className="text-muted-foreground">Amount:</span> <span className="font-medium">{Number(receipt?.amount ?? 0).toLocaleString()}</span></div>
                      <div className="text-sm"><span className="text-muted-foreground">Provider:</span> <span className="font-medium">{String(receipt?.provider ?? "—")}</span></div>
                      <div className="text-sm"><span className="text-muted-foreground">Status:</span> <span className="font-medium">{String(receipt?.review_status ?? "—")}</span></div>
                      {receipt?.reject_reason && (
                        <div className="text-sm"><span className="text-muted-foreground">Reject reason:</span> <span className="font-medium">{String(receipt.reject_reason)}</span></div>
                      )}
                      <div className="text-xs text-muted-foreground">Uploaded: {String(receipt?.created_at ?? "—")}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    {st === "pending" ? (
                      <>
                        <Button onClick={() => approveM.mutate(Number(selectedId))} disabled={busy}>Approve</Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            const reason = (prompt("Reject reason (required):") ?? "").trim();
                            if (!reason) return;
                            rejectM.mutate({ id: Number(selectedId), reason });
                          }}
                          disabled={busy}
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">Already reviewed.</div>
                    )}
                  </div>

                  <Separator />
                  <details className="rounded-lg border bg-slate-50 p-3">
                    <summary className="cursor-pointer text-sm font-medium">Raw JSON</summary>
                    <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(receipt, null, 2)}</pre>
                  </details>
                </>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}
