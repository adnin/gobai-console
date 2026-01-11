import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { supportListOrders } from "@/features/support/api/supportApi";

function fmt(ts?: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function SupportOrdersPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState<string>("");
  const [qText, setQText] = useState<string>("");

  const params = useMemo(
    () => ({
      status: status || undefined,
      q: qText || undefined,
      per_page: 25,
      page: 1,
    }),
    [status, qText]
  );

  const q = useQuery({
    queryKey: ["support", "orders", params],
    queryFn: async () => supportListOrders(String(token), params),
    enabled: !!token,
  });

  const rows = q.data?.data ?? [];

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Order Search</div>
          <div className="text-sm text-muted-foreground">Find orders by code/address/notes.</div>
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
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="delivering">Delivering</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <div className="mb-1 text-xs text-muted-foreground">Search</div>
              <Input value={qText} onChange={(e) => setQText(e.target.value)} placeholder="code / pickup / dropoff / notes" />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => q.refetch()} disabled={q.isFetching}>
                {q.isFetching ? "Searching…" : "Search"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setStatus("");
                  setQText("");
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-4" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
          <div className="text-sm text-muted-foreground">{q.isLoading ? "Loading…" : `${rows.length} rows`}</div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Driver</th>
                  <th className="px-3 py-2">Store</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">
                      <Link className="underline" to={`/support/orders/${r.id}`}>#{r.id}</Link>
                    </td>
                    <td className="px-3 py-2">{r.reference_no ?? r.code ?? "—"}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.customer?.name ?? r.customer_id ?? "—"}</td>
                    <td className="px-3 py-2">{r.driver?.name ?? r.driver_id ?? "—"}</td>
                    <td className="px-3 py-2">{r.store?.name ?? r.store_id ?? "—"}</td>
                    <td className="px-3 py-2">{r.total_price ?? "—"}</td>
                    <td className="px-3 py-2">{fmt(r.created_at ?? r.order_time)}</td>
                  </tr>
                ))}
                {!q.isLoading && rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {q.isError && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              Failed to load orders. {(q.error as any)?.message ?? ""}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
