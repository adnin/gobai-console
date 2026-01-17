import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { formatCount } from "@/lib/utils";
import { getErrorMessage } from "@/lib/apiError";
import { trackScreenView } from "@/lib/analytics";
import { partnerUsage } from "@/features/dispatch/api/partnerApi";
import { AlertTriangle, Calendar } from "lucide-react";

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toStartIso(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

function toEndIso(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59`).toISOString();
}

export function PartnerUsagePage() {
  const { token } = useAuth();
  const today = React.useMemo(() => new Date(), []);
  const defaultEnd = formatDateInput(today);
  const defaultStart = formatDateInput(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000));

  const [startDate, setStartDate] = React.useState(defaultStart);
  const [endDate, setEndDate] = React.useState(defaultEnd);

  React.useEffect(() => {
    trackScreenView("Usage", { module: "dispatch" });
  }, []);

  const usageQuery = useQuery({
    queryKey: ["partner-usage", startDate, endDate],
    enabled: !!token,
    queryFn: async () => {
      if (!token) throw new Error("Missing token");
      return partnerUsage(token, { start: toStartIso(startDate), end: toEndIso(endDate) });
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const isUnauthorized = usageQuery.isError && (usageQuery.error as any)?.status === 403;
  const isTenantError = isUnauthorized && String((usageQuery.error as any)?.message || "").toLowerCase().includes("tenant");

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage & billing summary</CardTitle>
          <div className="text-sm text-muted-foreground">Review job volume, active drivers, and billing totals.</div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Start date</div>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">End date</div>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button variant="secondary" onClick={() => usageQuery.refetch()} disabled={usageQuery.isFetching}>
              {usageQuery.isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {usageQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-3 py-6">
            <div className="h-4 w-40 animate-pulse rounded bg-muted/50" />
            <div className="h-4 w-56 animate-pulse rounded bg-muted/40" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted/30" />
          </CardContent>
        </Card>
      ) : usageQuery.isError ? (
        <EmptyState
          title={isTenantError ? "Tenant access required" : "Unable to load usage"}
          description={
            isTenantError
              ? "You do not have access to this fleet. Ask an admin to grant access."
              : getErrorMessage(usageQuery.error, "Try refreshing.")
          }
          icon={AlertTriangle}
          actions={<Button variant="secondary" onClick={() => usageQuery.refetch()}>Retry</Button>}
        />
      ) : usageQuery.data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Usage window</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" /> {usageQuery.data.window.start} → {usageQuery.data.window.end}
              </div>
              <div className="text-xs text-muted-foreground">Days: {usageQuery.data.window.days}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Jobs & seats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>Jobs total: {formatCount(usageQuery.data.usage.jobs_total)}</div>
              <div>Completed: {formatCount(usageQuery.data.usage.jobs_completed)}</div>
              <div>Cancelled: {formatCount(usageQuery.data.usage.jobs_cancelled)}</div>
              <div>Active drivers: {formatCount(usageQuery.data.usage.active_drivers)}</div>
              <div>Seats total: {formatCount(usageQuery.data.usage.seats_total)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Billing totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>Base fee: {usageQuery.data.billing.base_fee_points} pts</div>
              <div>Per job: {usageQuery.data.billing.per_job_points} pts</div>
              <div>Per active driver: {usageQuery.data.billing.per_active_driver_points} pts</div>
              <div>Per seat: {usageQuery.data.billing.per_seat_points} pts</div>
              <div className="font-semibold">Total: {usageQuery.data.billing.total_points} pts</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          title="No usage data"
          description="No usage metrics are available for the selected window."
          icon={AlertTriangle}
        />
      )}
    </div>
  );
}
