import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { adminApproveMerchant, adminMerchantsPending, adminRejectMerchant } from "@/features/admin/api/adminApi";

export function AdminMerchantsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const list = useQuery({
    queryKey: ["admin", "merchants", "pending", q],
    queryFn: async () => adminMerchantsPending(String(token), { per_page: 50, page: 1, q: q.trim() || undefined }),
    enabled: !!token,
  });

  // API: { data: paginator }
  const rows = (list.data as any)?.data?.data ?? [];

  const approveM = useMutation({
    mutationFn: async (id: number) => adminApproveMerchant(String(token), id),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin", "merchants", "pending"] }),
  });

  const rejectM = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => adminRejectMerchant(String(token), id, reason),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin", "merchants", "pending"] }),
  });

  const busy = approveM.isPending || rejectM.isPending;

  const shown = useMemo(() => {
    const arr = Array.isArray(rows) ? rows : [];
    if (!q.trim()) return arr;
    const qq = q.trim().toLowerCase();
    return arr.filter((r: any) => String(r.name ?? r.store_name ?? "").toLowerCase().includes(qq));
  }, [rows, q]);

  return (
    <div className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Merchants pending</div>
          <div className="text-sm text-muted-foreground">Approve/reject merchant onboarding.</div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm"><Link to="/admin">Back</Link></Button>
          <Button variant="secondary" size="sm" onClick={() => list.refetch()} disabled={list.isFetching}>{list.isFetching ? "Refreshing…" : "Refresh"}</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Input className="max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by store name" />
            <Button variant="secondary" onClick={() => setQ("")}>Clear</Button>
          </div>
          <Separator className="my-3" />

          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Store</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r: any) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{r.id}</td>
                    <td className="px-3 py-2">{String(r.name ?? r.store_name ?? "—")}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{String(r.owner_name ?? r.user_name ?? r.owner_email ?? "—")}</td>
                    <td className="px-3 py-2">{String(r.created_at ?? "—")}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => approveM.mutate(r.id)} disabled={busy}>Approve</Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const reason = (prompt("Reject reason (required):") ?? "").trim();
                            if (!reason) return;
                            rejectM.mutate({ id: r.id, reason });
                          }}
                          disabled={busy}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!list.isLoading && shown.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No pending merchants.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {(list.isError || approveM.isError || rejectM.isError) && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              {(list.error as any)?.message ?? (approveM.error as any)?.message ?? (rejectM.error as any)?.message ?? "Request failed"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
