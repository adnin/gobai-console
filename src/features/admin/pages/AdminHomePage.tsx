import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import {
  adminCashins,
  adminCashouts,
  adminDriverApplications,
  adminMerchantsPending,
  adminReceiptStats,
} from "@/features/admin/api/adminApi";
import { adminListPartnerApplications } from "@/features/admin/api/adminPartnerApi";

function getPaginatorTotal(resp: any): number {
  // Handles both shapes:
  // 1) { data: { data: [...], total: N } } (Laravel paginator)
  // 2) { data: [...], meta: { total: N } } (API wrapper Paginated)
  const laravelTotal = Number(resp?.data?.total);
  if (Number.isFinite(laravelTotal)) return laravelTotal;
  const metaTotal = Number(resp?.meta?.total);
  if (Number.isFinite(metaTotal)) return metaTotal;
  const arr = resp?.data;
  if (Array.isArray(arr)) return arr.length;
  return 0;
}

export function AdminHomePage() {
  const { token } = useAuth();

  const q = useQuery({
    queryKey: ["admin", "home", "counts"],
    enabled: !!token,
    refetchInterval: 30_000,
    queryFn: async () => {
      const t = String(token);
      const [
        partnerApps,
        merchants,
        drivers,
        cashins,
        cashouts,
        receiptStats,
      ] = await Promise.all([
        adminListPartnerApplications(t, { status: "pending", page: 1, limit: 1 }),
        adminMerchantsPending(t, { page: 1, per_page: 1 }),
        adminDriverApplications(t, { status: "pending", page: 1, per_page: 1 }),
        adminCashins(t, { status: "submitted" }),
        adminCashouts(t, { status: "hold" }),
        adminReceiptStats(t),
      ]);

      return {
        partner_apps_pending: getPaginatorTotal(partnerApps),
        merchants_pending: getPaginatorTotal(merchants),
        drivers_pending: getPaginatorTotal(drivers),
        cashins_pending: Array.isArray((cashins as any)?.data) ? (cashins as any).data.length : 0,
        cashouts_pending: Array.isArray((cashouts as any)?.data) ? (cashouts as any).data.length : 0,
        receipts_pending: Number((receiptStats as any)?.counts?.pending ?? 0) || 0,
      };
    },
  });

  const counts = q.data ?? {
    partner_apps_pending: 0,
    merchants_pending: 0,
    drivers_pending: 0,
    cashins_pending: 0,
    cashouts_pending: 0,
    receipts_pending: 0,
  };

  const items = [
    {
      title: "Partner applications",
      desc: "Review + approve territory partners.",
      to: "/admin/partner-applications",
      badge: counts.partner_apps_pending,
    },
    {
      title: "Merchants pending",
      desc: "Approve/reject merchant onboarding.",
      to: "/admin/merchants",
      badge: counts.merchants_pending,
    },
    {
      title: "Drivers",
      desc: "Approve/reject driver onboarding + documents.",
      to: "/admin/drivers",
      badge: counts.drivers_pending,
    },
    {
      title: "Wallet cash-ins",
      desc: "Approve submitted top-ups (credits wallet points).",
      to: "/admin/cashins",
      badge: counts.cashins_pending,
    },
    {
      title: "Wallet cash-outs",
      desc: "Approve payout requests (debits wallet points).",
      to: "/admin/cashouts",
      badge: counts.cashouts_pending,
    },
    {
      title: "Payment receipts",
      desc: "Review uploaded receipts and approve/reject.",
      to: "/admin/receipts",
      badge: counts.receipts_pending,
    },
    {
      title: "Order payment verification",
      desc: "Verify/reject GCash QR payments by order ID.",
      to: "/admin/orders/payment",
      badge: undefined,
    },
    {
      title: "Admin users",
      desc: "Search users and manage role assignments.",
      to: "/admin/users",
      badge: undefined,
    },
    {
      title: "Promotions",
      desc: "Create and manage promotional codes.",
      to: "/admin/promotions",
      badge: undefined,
    },
  ];

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Admin Console</div>
          <div className="text-sm text-muted-foreground">
            Approvals + safety controls. Most actions are auditable and idempotent.
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={q.isError ? "danger" : "secondary"}>
            {q.isFetching ? "Syncing…" : q.isError ? "Error" : "Live"}
          </Badge>
          <Button variant="secondary" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
            Refresh
          </Button>
        </div>
      </div>

      <Separator className="my-3" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => (
          <Card key={it.to}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{it.title}</span>
                {it.badge != null && Number(it.badge) > 0 && <Badge variant="danger">{Number(it.badge)}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">{it.desc}</div>
              <Button asChild>
                <Link to={it.to}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Guaranteed tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Guaranteed Delivery UI selection + breach reporting are listed in the roadmap. This web console includes the
              approvals/ops tools; add your guarantee report endpoint later and wire it here.
            </div>
          </CardContent>
        </Card>
      </div>

      {q.isError && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          {(q.error as any)?.message ?? "Failed to load admin counts"}
        </div>
      )}
    </div>
  );
}
