import * as React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  adminApproveDriverApplication,
  adminApproveDriverDocument,
  adminDriverApplications,
  adminRejectDriverApplication,
  adminRejectDriverDocument,
} from "@/features/admin/api/adminApi";

function StatusPill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium",
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white/50 hover:bg-white border-slate-200 text-slate-700"
      )}
    >
      {children}
    </button>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center overflow-auto p-4">
        <div className="w-full max-w-4xl rounded-2xl bg-card shadow-xl border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <div className="font-semibold">{title}</div>
            <button
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AdminDriversPage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const [status, setStatus] = React.useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [q, setQ] = React.useState<string>("");
  const [selected, setSelected] = React.useState<any | null>(null);

  const listQ = useQuery({
    queryKey: ["admin", "drivers", "applications", status],
    queryFn: async () =>
      adminDriverApplications(String(token), { status, page: 1, per_page: 50 }),
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  const approveAppM = useMutation({
    mutationFn: async (id: number) =>
      adminApproveDriverApplication(String(token), id),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["admin", "drivers", "applications"],
      });
    },
  });

  const rejectAppM = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      adminRejectDriverApplication(String(token), id, reason),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["admin", "drivers", "applications"],
      });
    },
  });

  const approveDocM = useMutation({
    mutationFn: async (id: number) =>
      adminApproveDriverDocument(String(token), id),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["admin", "drivers", "applications"],
      });
    },
  });

  const rejectDocM = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      adminRejectDriverDocument(String(token), id, reason),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["admin", "drivers", "applications"],
      });
    },
  });

  const paginator = (listQ.data as any)?.data; // Laravel paginator
  const rows: any[] = Array.isArray(paginator?.data)
    ? paginator.data
    : Array.isArray((listQ.data as any)?.data)
    ? (listQ.data as any).data
    : [];

  const filtered = rows.filter((r: any) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    const hay = [r?.user?.name, r?.user?.email, r?.user?.mobile, r?.id]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });

  const busy =
    approveAppM.isPending ||
    rejectAppM.isPending ||
    approveDocM.isPending ||
    rejectDocM.isPending;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Driver Applications</h1>
          <div className="text-sm text-muted-foreground">
            Approve/reject driver profiles and verify uploaded documents.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/admin">Back</Link>
          </Button>
          <StatusPill
            active={status === "pending"}
            onClick={() => setStatus("pending")}
          >
            Pending
          </StatusPill>
          <StatusPill
            active={status === "approved"}
            onClick={() => setStatus("approved")}
          >
            Approved
          </StatusPill>
          <StatusPill
            active={status === "rejected"}
            onClick={() => setStatus("rejected")}
          >
            Rejected
          </StatusPill>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Queue</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search: name, email, mobile…"
                className="w-full sm:w-80"
              />
              <Button
                variant="secondary"
                onClick={() => listQ.refetch()}
                disabled={listQ.isFetching}
              >
                {listQ.isFetching ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {listQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No applications"
              description="No driver applications match your filters. Try switching status or searching by name/email."
              actions={
                <Button variant="secondary" onClick={() => listQ.refetch()}>
                  Refresh
                </Button>
              }
            />
          ) : (
            <DataTable zebra dense>
              <thead className="bg-slate-50 text-slate-700">
                <tr className="text-left">
                  <th className="px-3 py-2">Applicant</th>
                  <th className="px-3 py-2 hidden md:table-cell">Docs</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 w-[260px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => {
                  const st = String(r?.status ?? status).toLowerCase();
                  const docs: any[] = Array.isArray(r?.documents)
                    ? r.documents
                    : [];
                  const docsPending = docs.filter(
                    (d) =>
                      String(
                        d?.status ?? d?.approval_status ?? ""
                      ).toLowerCase() === "pending"
                  ).length;
                  const docsApproved = docs.filter(
                    (d) =>
                      String(
                        d?.status ?? d?.approval_status ?? ""
                      ).toLowerCase() === "approved"
                  ).length;
                  const docsRejected = docs.filter(
                    (d) =>
                      String(
                        d?.status ?? d?.approval_status ?? ""
                      ).toLowerCase() === "rejected"
                  ).length;

                  const userId = r?.user_id ?? r?.user?.id;

                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">
                          {r?.user?.name ?? `User #${r?.user_id ?? "—"}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r?.user?.email ?? ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r?.user?.mobile ?? ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            Approved: {docsApproved}
                          </Badge>
                          <Badge
                            variant={
                              docsPending > 0 ? "danger" : "secondary"
                            }
                          >
                            Pending: {docsPending}
                          </Badge>
                          <Badge variant="secondary">
                            Rejected: {docsRejected}
                          </Badge>
                        </div>
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
                          <Button
                            variant="secondary"
                            onClick={() => setSelected(r)}
                          >
                            View docs
                          </Button>
                          {st === "pending" && (
                            <>
                              <Button
                                onClick={() => userId && approveAppM.mutate(userId)}
                                disabled={busy || !userId}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  const reason = (
                                    prompt("Reject reason (required):") ?? ""
                                  ).trim();
                                  if (!reason) return;
                                  if (!userId) return;
                                  rejectAppM.mutate({ id: userId, reason });
                                }}
                                disabled={busy || !userId}
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
            </DataTable>
          )}

          {(listQ.isError ||
            approveAppM.isError ||
            rejectAppM.isError ||
            approveDocM.isError ||
            rejectDocM.isError) && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              {(listQ.error as any)?.message ??
                (approveAppM.error as any)?.message ??
                (rejectAppM.error as any)?.message ??
                (approveDocM.error as any)?.message ??
                (rejectDocM.error as any)?.message ??
                "Request failed"}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Driver documents — ${
          selected?.user?.name ?? `Application #${selected?.id ?? ""}`
        }`}
      >
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Approve documents first (if required) then approve the application.
          </div>
          <Separator />

          <DataTable dense zebra>
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 hidden sm:table-cell">Link</th>
                <th className="px-3 py-2 w-[240px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(selected?.documents)
                ? selected?.documents
                : []
              ).map((d: any) => {
                const st = String(
                  d?.status ?? d?.approval_status ?? "pending"
                ).toLowerCase();
                const href = d?.file_url ?? d?.url ?? d?.path;
                return (
                  <tr key={d.id} className="border-t">
                    <td className="px-3 py-2 font-medium">
                      {String(d?.type ?? d?.document_type ?? "—")}
                    </td>
                    <td className="px-3 py-2">{st}</td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      {href ? (
                        <a
                          className="link underline"
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {st === "pending" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => approveDocM.mutate(d.id)}
                              disabled={busy}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const reason = (
                                  prompt("Reject reason (required):") ?? ""
                                ).trim();
                                if (!reason) return;
                                rejectDocM.mutate({ id: d.id, reason });
                              }}
                              disabled={busy}
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No actions
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {(!selected?.documents || selected?.documents.length === 0) && (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-muted-foreground"
                    colSpan={4}
                  >
                    No documents uploaded.
                  </td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </div>
      </Modal>
    </div>
  );
}
