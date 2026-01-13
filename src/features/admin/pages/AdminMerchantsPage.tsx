import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth";
import { adminApproveMerchant, adminMerchantsPending, adminRejectMerchant } from "@/features/admin/api/adminApi";
import { ShieldOff, UserRound } from "lucide-react";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/ui/toast/ToastProvider";


const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
const PUBLIC_BASE = String(API_BASE).replace(/\/api(?:\/v\d+)?\/?$/, "");

function resolveDocumentUrl(path?: string | null): string | null {
  if (!path) return null;
  const trimmed = String(path).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) return trimmed;

  const normalized = (() => {
    if (trimmed.startsWith("/")) return trimmed;
    if (trimmed.startsWith("storage/") || trimmed.startsWith("public/")) return `/${trimmed}`;
    return `/storage/${trimmed.replace(/^\/+/, "")}`;
  })();

  const base = PUBLIC_BASE.replace(/\/$/, "");
  return `${base}${normalized}`;
}

type PendingMerchantRow = {
  merchantId: number;
  accountId: number;
  storeName: string;
  registrationNumber: string | null;
  dtiCertificatePath: string | null;
  dtiDocumentStatus: string | null;
  ownerName: string;
  ownerEmail: string | null;
  ownerPhone: string | null;
  createdAtRaw: string | null;
  createdAtDisplay: string;
  documentsCount: number;
  status: string | null;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return dateFormatter.format(date);
  } catch {
    return value;
  }
}

function pickDisplayString(values: unknown[], fallback = "—"): string {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length) return trimmed;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return fallback;
}

function pickOptionalString(values: unknown[]): string | null {
  const text = pickDisplayString(values, "");
  return text ? text : null;
}

function toDisplayRow(row: any): PendingMerchantRow {
  const user = row?.user ?? {};
  const createdSource = row?.applied_at ?? row?.created_at ?? row?.updated_at ?? null;
  const documents: any[] = Array.isArray(row?.documents) ? row.documents : [];
  const dtiDocument = documents.find((doc) => doc?.type === "dti_certificate") ?? null;
  const dtiStatus = pickOptionalString([dtiDocument?.status]);
  const dtiPath = pickOptionalString([row?.dti_certificate_path, dtiDocument?.path]);

  return {
    merchantId: Number(row?.id ?? 0) || 0,
    accountId: Number(row?.user_id ?? user?.id ?? row?.id ?? 0) || 0,
    storeName: pickDisplayString([
      row?.business_name,
      row?.store_name,
      row?.name,
      user?.business_name,
    ]),
    registrationNumber: pickOptionalString([row?.dti_registration_number]),
    dtiCertificatePath: dtiPath,
    dtiDocumentStatus: dtiStatus,
    ownerName: pickDisplayString([
      user?.name,
      row?.owner_name,
      row?.owner,
      user?.email,
      "Pending owner",
    ]),
    ownerEmail: pickOptionalString([user?.email, row?.owner_email]),
    ownerPhone: pickOptionalString([user?.phone, user?.mobile, row?.owner_phone, row?.contact_number]),
    createdAtRaw: createdSource,
    createdAtDisplay: formatDateTime(createdSource),
    documentsCount: documents.length,
    status: pickOptionalString([row?.status]),
  };
}

function matchesQuery(row: PendingMerchantRow, term: string) {
  const haystacks = [row.storeName, row.ownerName, row.ownerEmail ?? "", row.ownerPhone ?? ""];
  return haystacks.some((value) => value.toLowerCase().includes(term));
}

function isStatusError(err: unknown, status: number) {
  if (!err || typeof err !== "object") return false;
  const maybe = err as { status?: number };
  return typeof maybe.status === "number" && maybe.status === status;
}

export function AdminMerchantsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const list = useQuery({
    queryKey: ["admin", "merchants", "pending", q],
    queryFn: async () =>
      adminMerchantsPending(String(token), {
        per_page: 50,
        page: 1,
        q: q.trim() || undefined,
      }),
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  const paginator = (list.data as any)?.data;
  const rawRows: any[] = Array.isArray(paginator?.data) ? paginator.data : [];

  const normalizedRows = useMemo(() => rawRows.map((row) => toDisplayRow(row)), [rawRows]);

  const filteredRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return normalizedRows;
    return normalizedRows.filter((row) => matchesQuery(row, term));
  }, [normalizedRows, q]);

  const approveM = useMutation({
    mutationFn: async (id: number) => adminApproveMerchant(String(token), id),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin", "merchants", "pending"] }),
  });

  const rejectM = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      adminRejectMerchant(String(token), id, reason),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin", "merchants", "pending"] }),
  });

  const busy = approveM.isPending || rejectM.isPending;
  const totalPending = paginator?.total ?? normalizedRows.length;
  const isEmpty = !list.isLoading && filteredRows.length === 0;
  const emptyTitle = q.trim() ? "No merchants match that search" : "No pending merchants";
  const emptyDescription = q.trim()
    ? "Try searching by store name, owner email, or contact number."
    : "You'll see merchant applications waiting for approval here.";
  const unauthorized = list.isError && isStatusError(list.error, 403);
  const showError = !unauthorized && (list.isError || approveM.isError || rejectM.isError);
  const errorMessage =
    (list.error as any)?.message ?? (approveM.error as any)?.message ?? (rejectM.error as any)?.message ?? "Request failed";

  const skeletonRows = Array.from({ length: 4 }).map((_, idx) => (
    <tr key={`loading-${idx}`} className="border-t border-border">
      {Array.from({ length: 5 }).map((__, cellIdx) => (
        <td key={cellIdx} className="px-3 py-4">
          <div className="h-4 w-full max-w-[140px] rounded bg-muted/40 animate-pulse" />
        </td>
      ))}
    </tr>
  ));

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action: string;
    merchantId: number | null;
    reason?: string;
  }>({
    isOpen: false,
    action: "",
    merchantId: null,
  });

  const toast = useToast();

  const handleApprove = (id: number) => {
    setModalState({ isOpen: true, action: "approve", merchantId: id });
  };

  const handleReject = (id: number) => {
    setModalState({ isOpen: true, action: "reject", merchantId: id });
  };

  const confirmAction = () => {
    const { action, merchantId, reason } = modalState;
    if (!merchantId) return;
    if (action === "approve") {
      approveM.mutate(merchantId, {
        onSuccess: () => {
          toast.ok("Merchant approved successfully!");
          setModalState({ isOpen: false, action: "", merchantId: null });
        },
      });
    } else if (action === "reject") {
      rejectM.mutate(
        { id: merchantId, reason: reason || "" },
        {
          onSuccess: () => {
            toast.ok("Merchant rejected successfully!");
            setModalState({ isOpen: false, action: "", merchantId: null });
          },
        }
      );
    }
  };

  return (
    <div className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Merchants pending</div>
          <div className="text-sm text-muted-foreground">
            Review onboarding submissions before stores go live on the marketplace.
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/admin">Back</Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => list.refetch()}
            disabled={list.isFetching}
          >
            {list.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval queue</CardTitle>
        </CardHeader>
        <CardContent>
          {unauthorized ? (
            <EmptyState
              title="You don't have access to merchant approvals"
              description="Ask a system administrator to grant this permission, then reload the page."
              icon={ShieldOff}
              actions={
                <Button asChild variant="secondary" size="sm">
                  <Link to="/admin">Back to admin home</Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Input
                  className="min-w-[220px] max-w-sm"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search store, owner, or contact"
                />
                <Button variant="secondary" onClick={() => setQ("")} disabled={!q.trim()}>
                  Clear
                </Button>
              </div>
              <Separator className="my-3" />

              <div className="overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Store</th>
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.isLoading
                      ? skeletonRows
                      : filteredRows.map((row) => {
                          const dtiUrl = resolveDocumentUrl(row.dtiCertificatePath);
                          const dtiApproved = row.dtiDocumentStatus === "approved";
                          const dtiStatusLabel = (row.dtiDocumentStatus ?? "pending").replace(/_/g, " ");

                          return (
                            <tr key={row.merchantId} className="border-t border-border hover:bg-muted/20">
                              <td className="px-3 py-2 align-top font-medium">#{row.merchantId}</td>
                              <td className="px-3 py-2 align-top">
                                <div className="font-medium leading-tight">{row.storeName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {row.registrationNumber ? `DTI ${row.registrationNumber}` : "DTI number not provided"}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <Badge variant="outline" className="text-[11px]">
                                    Docs {row.documentsCount}
                                  </Badge>
                                  {row.status ? (
                                    <Badge variant="secondary" className="text-[11px] capitalize">
                                      {row.status}
                                    </Badge>
                                  ) : null}
                                  {row.dtiDocumentStatus ? (
                                    <Badge
                                      variant={dtiApproved ? "success" : "warning"}
                                      className="text-[11px] capitalize"
                                    >
                                      {`DTI ${dtiStatusLabel}`}
                                    </Badge>
                                  ) : null}
                                </div>
                                {row.dtiCertificatePath ? (
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                    {dtiApproved && dtiUrl ? (
                                      <PhotoProvider>
                                        <PhotoView src={dtiUrl}>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                            className="h-7 px-2 text-xs cursor-pointer"
                                          >
                                            <span>View DTI file</span>
                                          </Button>
                                        </PhotoView>
                                      </PhotoProvider>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        DTI file uploaded, awaiting approval
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    DTI certificate file not uploaded
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="font-medium leading-tight">{row.ownerName}</div>
                                {row.ownerEmail ? (
                                  <div className="text-xs text-muted-foreground">{row.ownerEmail}</div>
                                ) : null}
                                {row.ownerPhone ? (
                                  <div className="text-xs text-muted-foreground">{row.ownerPhone}</div>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="font-medium leading-tight">{row.createdAtDisplay}</div>
                                {row.createdAtRaw ? (
                                  <div className="text-xs text-muted-foreground">{row.createdAtRaw}</div>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" onClick={() => handleApprove(row.accountId)} disabled={busy}>
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="secondary" onClick={() => handleReject(row.accountId)} disabled={busy}>
                                    Reject
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    {isEmpty ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6">
                          <EmptyState
                            title={emptyTitle}
                            description={emptyDescription}
                            icon={UserRound}
                            actions={
                              <>
                                {q.trim() ? (
                                  <Button size="sm" variant="secondary" onClick={() => setQ("")}>
                                    Clear search
                                  </Button>
                                ) : null}
                                <Button size="sm" onClick={() => list.refetch()} disabled={list.isFetching}>
                                  {list.isFetching ? "Refreshing…" : "Refresh"}
                                </Button>
                              </>
                            }
                          />
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {!list.isLoading && !isEmpty ? (
                <div className="px-1 pt-3 text-xs text-muted-foreground">
                  Showing {filteredRows.length} of {totalPending} pending merchant{totalPending === 1 ? "" : "s"}.
                </div>
              ) : null}

              {showError ? (
                <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  {errorMessage}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={modalState.isOpen} onClose={() => setModalState({ isOpen: false, action: "", merchantId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalState.action === "approve" ? "Approve Merchant" : "Reject Merchant"}
            </DialogTitle>
          </DialogHeader>
          <div>
            {modalState.action === "reject" && (
              <textarea
                placeholder="Enter rejection reason"
                className="w-full border rounded p-2"
                value={modalState.reason || ""}
                onChange={(e) => setModalState((prev) => ({ ...prev, reason: e.target.value }))}
              />
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => confirmAction()}
              disabled={busy}
            >
              Confirm
            </Button>
            <Button
              variant="secondary"
              onClick={() => setModalState({ isOpen: false, action: "", merchantId: null })}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
