import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { financeReconcileReports, financeReconcileRun } from "@/features/finance/api/financeApi";

export function FinanceReconcilePage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const [dryRun, setDryRun] = useState<boolean>(true);
  const [repair, setRepair] = useState<boolean>(false);

  const reportsParams = useMemo(() => ({ per_page: 25 }), []);
  const reports = useQuery({
    queryKey: ["finance", "reconcile", "reports", reportsParams],
    queryFn: async () => financeReconcileReports(String(token), reportsParams),
    enabled: !!token,
  });

  const m = useMutation({
    mutationFn: async () => financeReconcileRun(String(token), { dry_run: dryRun, repair }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["finance", "reconcile", "reports"] });
    },
  });

  const list = reports.data?.data ?? reports.data?.data?.data ?? reports.data?.data ?? [];
  const latestReport = Array.isArray(list) && list.length > 0 ? list[0] : null;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Reconcile</div>
          <div className="text-sm text-muted-foreground">Runs wallet:reconcile and stores reports.</div>
        </div>
        <Button asChild variant="secondary">
          <Link to="/finance">Finance Home</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                <span>Dry run</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={repair} onChange={(e) => setRepair(e.target.checked)} />
                <span>Repair mismatches (if supported)</span>
              </label>

              <Button className="w-full" onClick={() => m.mutate()} disabled={m.isPending}>
                {m.isPending ? "Running…" : "Run reconcile"}
              </Button>

              {m.isError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  {(m.error as any)?.message ?? "Reconcile failed"}
                </div>
              )}

              {m.isSuccess && (
                <div className="rounded-lg border border-emerald-600/30 bg-emerald-600/10 p-3 text-sm">
                  Reconcile executed. Latest report updated.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Latest report</CardTitle>
          </CardHeader>
          <CardContent>
            {latestReport ? (
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">ID:</span> <span className="font-semibold">{latestReport.id}</span></div>
                <div><span className="text-muted-foreground">Dry run:</span> <span className="font-semibold">{String(!!latestReport.is_dry_run)}</span></div>
                <div><span className="text-muted-foreground">Created:</span> <span className="font-semibold">{String(latestReport.created_at ?? "—")}</span></div>
                <Button asChild variant="secondary"><Link to={`/finance/reconcile/${latestReport.id}`}>View details</Link></Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No report yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-4" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reports</CardTitle>
          <div className="text-sm text-muted-foreground">Newest first.</div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Dry run</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r: any) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium"><Link className="underline" to={`/finance/reconcile/${r.id}`}>{r.id}</Link></td>
                    <td className="px-3 py-2">{String(!!r.is_dry_run)}</td>
                    <td className="px-3 py-2">{String(r.created_at ?? "—")}</td>
                  </tr>
                ))}
                {!reports.isLoading && list.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={3}>No reports found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {reports.isError && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              {(reports.error as any)?.message ?? "Failed to load reports"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
