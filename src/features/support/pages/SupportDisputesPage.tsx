import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { supportListDisputes } from "@/features/support/api/supportApi";

function fmt(ts?: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function SupportDisputesPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState<string>("open");
  const [orderId, setOrderId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");

  const params = useMemo(() => {
    return {
      status: status || undefined,
      order_id: orderId ? Number(orderId) : undefined,
      customer_id: customerId ? Number(customerId) : undefined,
      limit: 25,
      page: 1,
    };
  }, [status, orderId, customerId]);

  const q = useQuery({
    queryKey: ["support", "disputes", params],
    queryFn: async () => supportListDisputes(String(token), params),
    enabled: !!token,
    refetchInterval: 10_000,
  });

  const rows = q.data?.data ?? [];

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Disputes</div>
          <div className="text-sm text-muted-foreground">
            Trust Layer v1 — investigate & resolve.
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link to="/support">Support Home</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Status</div>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Order ID</div>
              <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="e.g. 123" />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Customer ID</div>
              <Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="e.g. 45" />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setOrderId("");
                  setCustomerId("");
                  setStatus("open");
                }}
              >
                Reset
              </Button>
              <Button onClick={() => q.refetch()} disabled={q.isFetching}>
                {q.isFetching ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-4" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
          <div className="text-sm text-muted-foreground">
            {q.isLoading ? "Loading…" : `${rows.length} rows`}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Evidence</th>
                  <th className="px-3 py-2">Opened</th>
                  <th className="px-3 py-2">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">
                      <Link className="underline" to={`/support/disputes/${r.id}`}>{r.id}</Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link className="underline" to={`/support/orders/${r.delivery_order_id}`}>#{r.delivery_order_id}</Link>
                    </td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.reason_code}</td>
                    <td className="px-3 py-2">{r.evidence_count ?? 0}</td>
                    <td className="px-3 py-2">{fmt(r.opened_at)}</td>
                    <td className="px-3 py-2">{fmt(r.resolved_at)}</td>
                  </tr>
                ))}
                {!q.isLoading && rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                      No disputes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {q.isError && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              Failed to load disputes. {(q.error as any)?.message ?? ""}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
