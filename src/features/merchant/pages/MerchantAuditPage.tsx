import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { merchantAuditLogs } from "@/features/merchant/api/merchantApi";
import { MerchantTabs } from "@/features/merchant/components/MerchantTabs";

export function MerchantAuditPage() {
  const { token } = useAuth();
  const audit = useQuery({
    queryKey: ["merchant", "audit", 1],
    queryFn: async () => merchantAuditLogs(String(token), { per_page: 50, page: 1 }),
    enabled: !!token,
  });

  const rows = audit.data?.data?.data ?? audit.data?.data ?? audit.data ?? [];

  return (
    <div className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Audit log</div>
          <div className="text-sm text-muted-foreground">Security trail: orders, payouts, store changes.</div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm"><Link to="/merchant">Orders</Link></Button>
          <Button variant="secondary" size="sm" onClick={() => audit.refetch()} disabled={audit.isFetching}>
            {audit.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <MerchantTabs />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{r.id}</td>
                    <td className="px-3 py-2">{String(r.action ?? "—")}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {String(r.entity_type ?? "—")} #{String(r.entity_id ?? "—")}
                    </td>
                    <td className="px-3 py-2">{String(r.actor_id ?? "—")}</td>
                    <td className="px-3 py-2">{String(r.created_at ?? "—")}</td>
                  </tr>
                ))}
                {!audit.isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No events yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {audit.isError && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              {(audit.error as any)?.message ?? "Failed to load audit"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
