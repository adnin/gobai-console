import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PhotoProvider, PhotoView } from "react-photo-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import {
  SupportResolveDisputePayload,
  supportGetDispute,
  supportResolveDispute,
} from "@/features/support/api/supportApi";

function fmt(ts?: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function SupportDisputeDetailPage() {
  const { id } = useParams();
  const disputeId = Number(id);
  const { token } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["support", "disputes", disputeId],
    queryFn: async () => supportGetDispute(String(token), disputeId),
    enabled: !!token && Number.isFinite(disputeId) && disputeId > 0,
    refetchInterval: 10_000,
  });

  const d = q.data?.dispute;
  const evidence = d?.evidence ?? [];

  const [outcome, setOutcome] = useState<SupportResolveDisputePayload["outcome"]>("refund");
  const [note, setNote] = useState<string>("");
  const [refundPoints, setRefundPoints] = useState<string>("");
  const [driverPenaltyPoints, setDriverPenaltyPoints] = useState<string>("");
  const [merchantPenaltyPoints, setMerchantPenaltyPoints] = useState<string>("");

  const payload: SupportResolveDisputePayload = useMemo(() => {
    const p: SupportResolveDisputePayload = { outcome, note: note || undefined };
    if (outcome === "refund") p.refund_points = refundPoints ? Number(refundPoints) : 0;
    if (outcome === "penalty_driver") p.penalty_driver_points = driverPenaltyPoints ? Number(driverPenaltyPoints) : 0;
    if (outcome === "penalty_merchant") p.penalty_merchant_points = merchantPenaltyPoints ? Number(merchantPenaltyPoints) : 0;
    return p;
  }, [outcome, note, refundPoints, driverPenaltyPoints, merchantPenaltyPoints]);

  const m = useMutation({
    mutationFn: async () => supportResolveDispute(String(token), disputeId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["support", "disputes", disputeId] });
      await qc.invalidateQueries({ queryKey: ["support", "disputes"] });
    },
  });

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Dispute #{disputeId}</div>
          <div className="text-sm text-muted-foreground">Investigate evidence and resolve outcomes.</div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link to="/support/disputes">Back</Link>
          </Button>
          <Button onClick={() => q.refetch()} variant="secondary" disabled={q.isFetching}>
            {q.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {q.isError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          Failed to load dispute. {(q.error as any)?.message ?? ""}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="font-medium">{d?.status ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Reason</div>
                <div className="font-medium">{d?.reason_code ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Order</div>
                <div className="font-medium">
                  {d?.delivery_order_id ? (
                    <Link className="underline" to={`/support/orders/${d.delivery_order_id}`}>#{d.delivery_order_id}</Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Opened</div>
                <div className="font-medium">{fmt(d?.opened_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Resolved</div>
                <div className="font-medium">{fmt(d?.resolved_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Resolution</div>
                <div className="font-medium">{d?.resolution_kind || "—"}</div>
              </div>
            </div>

            <Separator className="my-4" />

            <div>
              <div className="text-xs text-muted-foreground">Description</div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{d?.description || d?.message || "—"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evidence</CardTitle>
            <div className="text-sm text-muted-foreground">Tap to open.</div>
          </CardHeader>
          <CardContent>
            <PhotoProvider>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {evidence.map((e) => (
                  <div key={e.id} className="rounded-lg border border-border bg-card p-2">
                    <div className="text-xs text-muted-foreground">{e.kind}</div>
                    {e.file_url ? (
                      <PhotoView src={e.file_url}>
                        <img
                          src={e.file_url}
                          alt={e.kind}
                          className="mt-2 h-28 w-full rounded-md object-cover"
                        />
                      </PhotoView>
                    ) : (
                      <div className="mt-2 h-28 w-full rounded-md bg-muted" />
                    )}
                    {e.note ? (
                      <div className="mt-2 line-clamp-3 text-xs">{e.note}</div>
                    ) : null}
                    <div className="mt-2 text-[11px] text-muted-foreground">{fmt(e.created_at)}</div>
                  </div>
                ))}
                {evidence.length === 0 && !q.isLoading && (
                  <div className="col-span-2 text-sm text-muted-foreground md:col-span-3">No evidence uploaded.</div>
                )}
              </div>
            </PhotoProvider>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-4" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resolve</CardTitle>
          <div className="text-sm text-muted-foreground">
            Resolution is idempotent-safe: if already closed, the API returns a conflict.
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Outcome</div>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as any)}
              >
                <option value="refund">Refund customer</option>
                <option value="reject">Reject dispute</option>
                <option value="penalty_driver">Penalize driver</option>
                <option value="penalty_merchant">Penalize merchant</option>
              </select>
            </div>

            {outcome === "refund" && (
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Refund points</div>
                <Input value={refundPoints} onChange={(e) => setRefundPoints(e.target.value)} placeholder="e.g. 50" />
              </div>
            )}

            {outcome === "penalty_driver" && (
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Driver penalty points</div>
                <Input
                  value={driverPenaltyPoints}
                  onChange={(e) => setDriverPenaltyPoints(e.target.value)}
                  placeholder="e.g. 20"
                />
              </div>
            )}

            {outcome === "penalty_merchant" && (
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Merchant penalty points</div>
                <Input
                  value={merchantPenaltyPoints}
                  onChange={(e) => setMerchantPenaltyPoints(e.target.value)}
                  placeholder="e.g. 20"
                />
              </div>
            )}

            <div className={outcome === "reject" ? "md:col-span-3" : "md:col-span-4"}>
              <div className="mb-1 text-xs text-muted-foreground">Note (optional)</div>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened? What did you decide?" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => m.mutate()}
              disabled={m.isPending || !d || d.status !== "open"}
            >
              {m.isPending ? "Resolving…" : d?.status !== "open" ? "Already closed" : "Resolve"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setOutcome("refund");
                setRefundPoints("");
                setDriverPenaltyPoints("");
                setMerchantPenaltyPoints("");
                setNote("");
              }}
            >
              Clear
            </Button>
            {m.isError && (
              <div className="text-sm text-destructive">{(m.error as any)?.message ?? "Resolve failed"}</div>
            )}
            {m.isSuccess && (
              <div className="text-sm text-emerald-600">Resolved.</div>
            )}
          </div>

          {d?.status !== "open" && (
            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              This dispute is <span className="font-medium">{d?.status}</span>. If you need to take further action, add a support note on the order.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
