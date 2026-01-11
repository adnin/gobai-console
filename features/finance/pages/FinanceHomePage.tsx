import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { envBool } from "@/lib/http";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { financeDashboard } from "@/features/finance/api/financeApi";

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v.toLocaleString() : "—";
}

export function FinanceHomePage() {
  const { token } = useAuth();

  const q = useQuery({
    queryKey: ["finance", "dashboard"],
    queryFn: async () => financeDashboard(String(token)),
    enabled: !!token,
    refetchInterval: 15_000,
  });

  const d = q.data;

  // Determine whether to show the Promotions link. Finance users can only
  // access the promotions module when the VITE_ENABLE_FINANCE_PROMOS flag is
  // enabled. Admin and system users always see the link.
  const { viewer } = useAuth();
  const isAdmin = Array.isArray(viewer?.roles) && (viewer.roles.includes("admin") || viewer.roles.includes("system"));
  const enablePromos = envBool("VITE_ENABLE_FINANCE_PROMOS", false);
  const showPromotions = isAdmin || enablePromos;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Finance Console</div>
          <div className="text-sm text-muted-foreground">Wallet balances, adjustments, reconciliation.</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={q.isError ? "secondary" : "default"}>{q.isLoading ? "Loading…" : q.isError ? "Error" : "Live"}</Badge>
          <Button asChild variant="secondary" size="sm">
            <Link to="/finance/wallets">Wallets</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/finance/reconcile">Reconcile</Link>
          </Button>
          {showPromotions && (
            <Button asChild variant="secondary" size="sm">
              <Link to="/finance/promotions">Promotions</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total points</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Drivers</span><span className="font-semibold">{n(d?.wallets?.driver_total_points)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Merchants</span><span className="font-semibold">{n(d?.wallets?.merchant_total_points)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Customers</span><span className="font-semibold">{n(d?.wallets?.customer_total_points)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Topups</span><span className="font-semibold">{n(d?.requests?.topups_pending)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Cashouts</span><span className="font-semibold">{n(d?.requests?.cashouts_pending)}</span></div>
            <Separator />
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Today topups</span><span className="font-semibold">{n(d?.requests?.topups_today_points)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Today cashouts</span><span className="font-semibold">{n(d?.requests?.cashouts_today_points)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest reconcile report</CardTitle>
            <div className="text-sm text-muted-foreground">From wallet:reconcile</div>
          </CardHeader>
          <CardContent>
            {d?.reconciliation?.last_report ? (
              <div className="space-y-2">
                <div className="text-sm"><span className="text-muted-foreground">Report ID:</span> <span className="font-semibold">{d.reconciliation.last_report.id}</span></div>
                <div className="text-sm"><span className="text-muted-foreground">Dry run:</span> <span className="font-semibold">{String(!!d.reconciliation.last_report.is_dry_run)}</span></div>
                <div className="text-sm"><span className="text-muted-foreground">Created:</span> <span className="font-semibold">{String(d.reconciliation.last_report.created_at ?? "—")}</span></div>
                <Button asChild className="w-full" variant="secondary">
                  <Link to={`/finance/reconcile/${d.reconciliation.last_report.id}`}>View report</Link>
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No reports yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {q.isError && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          {(q.error as any)?.message ?? "Failed to load finance dashboard."}
        </div>
      )}
    </div>
  );
}
