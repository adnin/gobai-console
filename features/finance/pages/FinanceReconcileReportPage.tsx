import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { financeReconcileShow } from "@/features/finance/api/financeApi";

export function FinanceReconcileReportPage() {
  const { id } = useParams();
  const reportId = Number(id);
  const { token } = useAuth();

  const q = useQuery({
    queryKey: ["finance", "reconcile", "report", reportId],
    queryFn: async () => financeReconcileShow(String(token), reportId),
    enabled: !!token && Number.isFinite(reportId) && reportId > 0,
  });

  const report = q.data?.report;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Report #{reportId}</div>
          <div className="text-sm text-muted-foreground">Raw report payload</div>
        </div>
        <Button asChild variant="secondary">
          <Link to="/finance/reconcile">Back</Link>
        </Button>
      </div>

      {q.isError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          Failed to load report. {(q.error as any)?.message ?? ""}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-muted/20 p-3 text-xs">
            {report ? JSON.stringify(report, null, 2) : q.isLoading ? "Loading…" : "Not found"}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
