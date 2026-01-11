import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { envBool } from "@/lib/http";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { partnerKpiToday, partnerOverview } from "@/features/dispatch/api/partnerApi";

function n(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? v.toLocaleString() : "—";
}

function s(x: any) {
  const v = Number(x ?? 0);
  return Number.isFinite(v) ? `${v.toFixed(0)}s` : "—";
}

export function PartnerHomePage() {
  const { token } = useAuth();

  const ov = useQuery({
    queryKey: ["partner", "overview"],
    queryFn: async () => partnerOverview(String(token)),
    enabled: !!token,
    refetchInterval: 15_000,
  });

  const kpi = useQuery({
    queryKey: ["partner", "kpi", "today"],
    queryFn: async () => partnerKpiToday(String(token)),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const d = ov.data?.data;
  const k = kpi.data?.data;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Partner Console</div>
          <div className="text-sm text-muted-foreground">Territory performance + fleet dispatch.</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={ov.isError ? "secondary" : "default"}>{ov.isLoading ? "Loading…" : ov.isError ? "Error" : "Live"}</Badge>
          <Button asChild variant="secondary" size="sm">
            <Link to="/partner/dispatch">Dispatch</Link>
          </Button>
          {/* Show the Promotions link only when enabled. Admin/system always see it. */}
          {(() => {
            const { viewer } = useAuth();
            const isAdmin = Array.isArray(viewer?.roles) && (viewer.roles.includes("admin") || viewer.roles.includes("system"));
            const enablePromos = envBool("VITE_ENABLE_PARTNER_PROMOS", false);
            return isAdmin || enablePromos;
          })() && (
            <Button asChild variant="secondary" size="sm">
              <Link to="/partner/promotions">Promotions</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fleet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Drivers total</span><span className="font-semibold">{n(d?.drivers_total)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Drivers online</span><span className="font-semibold">{n(d?.drivers_online)}</span></div>
            <Separator />
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Wallet balance</span><span className="font-semibold">{n(d?.wallet_balance_points)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Active</span><span className="font-semibold">{n(d?.orders_active)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Searching</span><span className="font-semibold">{n(d?.orders_searching)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Assigned</span><span className="font-semibold">{n(d?.orders_assigned)}</span></div>
            <Separator />
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Completed today</span><span className="font-semibold">{n(d?.completed_today)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today KPI</CardTitle>
            <div className="text-sm text-muted-foreground">Operational health</div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Acceptance rate</span><span className="font-semibold">{k ? `${Math.round((k.acceptance_rate ?? 0) * 100)}%` : "—"}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Disputes opened</span><span className="font-semibold">{n(k?.disputes_opened)}</span></div>
            <Separator />
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Assign p50</span><span className="font-semibold">{s(k?.p50_assign_seconds)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Assign p90</span><span className="font-semibold">{s(k?.p90_assign_seconds)}</span></div>
          </CardContent>
        </Card>
      </div>

      {(ov.isError || kpi.isError) && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          {(ov.error as any)?.message ?? (kpi.error as any)?.message ?? "Failed to load partner data."}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 text-sm">
        Primary workflow: open Dispatch and keep the “Searching” lane close to zero by offering or assigning drivers quickly.
      </div>
    </div>
  );
}
