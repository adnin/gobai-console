import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { getDeliveryOrder, supportNoteOrder } from "@/features/support/api/supportApi";

function fmt(ts?: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function SupportOrderDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const { token } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["support", "order", orderId],
    queryFn: async () => getDeliveryOrder(String(token), orderId),
    enabled: !!token && Number.isFinite(orderId) && orderId > 0,
    refetchInterval: 10_000,
  });

  const order = q.data?.data ?? q.data; // some endpoints wrap in {data}

  const [note, setNote] = useState<string>("");

  const m = useMutation({
    mutationFn: async () => supportNoteOrder(String(token), orderId, note),
    onSuccess: async () => {
      setNote("");
      await qc.invalidateQueries({ queryKey: ["support", "order", orderId] });
    },
  });

  const headline = useMemo(() => {
    const ref = order?.reference_no ?? order?.code ?? "";
    const status = order?.status ?? "";
    return `${ref ? ref + " · " : ""}${status}`.trim();
  }, [order]);

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Order #{orderId}</div>
          <div className="text-sm text-muted-foreground">{headline || "—"}</div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link to="/support/orders">Back</Link>
          </Button>
          <Button onClick={() => q.refetch()} variant="secondary" disabled={q.isFetching}>
            {q.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {q.isError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          Failed to load order. {(q.error as any)?.message ?? ""}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="font-medium">{order?.status ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Store status</div>
                <div className="font-medium">{order?.store_status ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Customer</div>
                <div className="font-medium">{order?.customer?.name ?? order?.customer_id ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Driver</div>
                <div className="font-medium">{order?.driver?.name ?? order?.driver_id ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Pickup</div>
                <div className="font-medium line-clamp-2">{order?.pickup_address ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Dropoff</div>
                <div className="font-medium line-clamp-2">{order?.dropoff_address ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="font-medium">{order?.total_price ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="font-medium">{fmt(order?.created_at ?? order?.order_time)}</div>
              </div>
            </div>

            <Separator className="my-4" />

            <div>
              <div className="text-xs text-muted-foreground">Customer notes</div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{order?.customer_notes ?? order?.special_instructions ?? "—"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Support Note</CardTitle>
            <div className="text-sm text-muted-foreground">Adds an audit entry tied to this order.</div>
          </CardHeader>
          <CardContent>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write your investigation note…" />
            <div className="mt-3 flex items-center gap-2">
              <Button onClick={() => m.mutate()} disabled={m.isPending || note.trim().length < 2}>
                {m.isPending ? "Saving…" : "Save Note"}
              </Button>
              {m.isError && <div className="text-sm text-destructive">{(m.error as any)?.message ?? "Failed"}</div>}
              {m.isSuccess && <div className="text-sm text-emerald-600">Saved.</div>}
            </div>

            <div className="mt-6 rounded-lg border border-border bg-muted/20 p-3 text-sm">
              Need to resolve a dispute? Go to{" "}
              <Link className="underline" to={`/support/disputes?order_id=${orderId}`}>Disputes for this order</Link>.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
