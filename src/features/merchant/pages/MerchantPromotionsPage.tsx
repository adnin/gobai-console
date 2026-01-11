import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { MerchantTabs } from "@/features/merchant/components/MerchantTabs";
import {
  merchantPromotionsList,
  merchantCreatePromotion,
  merchantDeletePromotion,
  type MerchantPromotion,
} from "@/features/merchant/api/merchantPromotionApi";

/**
 * MerchantPromotionsPage
 *
 * This screen allows merchants to view and manage promotional codes for their store.
 * The design follows the enterprise dashboard guidelines: clear hierarchy, consistent spacing
 * and minimal distractions. Merchants can create new promotions, search existing ones and
 * delete outdated promos. Editing is left for a future iteration.
 */
export function MerchantPromotionsPage() {
  // Grab token and viewer from auth. Viewer contains roles to check admin/system.
  const { token, viewer } = useAuth();
  const qc = useQueryClient();

  // Determine if current viewer is admin or system. Only these users may
  // create or delete promotions. Other roles can view but not modify.
  const isAdmin = Array.isArray(viewer?.roles) && (viewer.roles.includes("admin") || viewer.roles.includes("system"));

  // Search filter state
  const [q, setQ] = React.useState("");

  // New promotion form state
  const [code, setCode] = React.useState("");
  const [type, setType] = React.useState("fixed");
  const [value, setValue] = React.useState<string>("");
  const [start, setStart] = React.useState<string>("");
  const [end, setEnd] = React.useState<string>("");
  const [max, setMax] = React.useState<string>("");

  // Fetch existing promotions
  const promosQ = useQuery({
    queryKey: ["merchant", "promotions"],
    queryFn: async () => merchantPromotionsList(String(token)),
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  const promos: MerchantPromotion[] = Array.isArray((promosQ.data as any)?.data)
    ? (promosQ.data as any).data
    : [];

  // Filter promotions client‑side by code substring
  const filtered = promos.filter((p) => {
    if (!q.trim()) return true;
    return p.code.toLowerCase().includes(q.trim().toLowerCase());
  });

  // Create mutation
  const createM = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: code.trim(),
        type: type.trim(),
        value: Number(value) || 0,
      };
      if (start.trim()) payload.start_at = start.trim();
      if (end.trim()) payload.end_at = end.trim();
      if (max.trim()) payload.max_redemptions = Number(max);
      return merchantCreatePromotion(String(token), payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "promotions"] });
      setCode("");
      setValue("");
      setStart("");
      setEnd("");
      setMax("");
    },
  });

  // Delete mutation
  const deleteM = useMutation({
    mutationFn: async (id: number) => merchantDeletePromotion(String(token), id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "promotions"] });
    },
  });

  // Only allow creation when user is admin/system and form fields are valid.
  const canCreate = isAdmin && code.trim().length >= 2 && Number(value) > 0;

  return (
    <div className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Promotions</div>
          <div className="text-sm text-muted-foreground">
            Create and manage promo codes for your store.
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/merchant">Back to Orders</Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => promosQ.refetch()}
            disabled={promosQ.isFetching}
          >
            {promosQ.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Merchant tabs for navigation */}
      <MerchantTabs />

      {/* Create promotion form (admin only) */}
      {isAdmin && (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">New promotion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="code">Code</label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SUMMER2026"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="type">Type</label>
              <select
                id="type"
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="fixed">Fixed amount</option>
                <option value="percent">Percent off</option>
                <option value="free">Free delivery</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="value">Value</label>
              <Input
                id="value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 50 (PHP) or 10 (percent)"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="start">Start at</label>
              <Input
                id="start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="end">End at</label>
              <Input
                id="end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="max">Max redemptions</label>
              <Input
                id="max"
                type="number"
                min="0"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div />
            <Button
              onClick={() => createM.mutate()}
              disabled={!canCreate || createM.isPending}
            >
              {createM.isPending ? "Creating…" : "Create promotion"}
            </Button>
          </div>
          {createM.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
              {(createM.error as any)?.message ?? "Failed to create promotion"}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Promotions list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your promotions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by code"
              className="w-full md:w-64"
            />
            <Button variant="secondary" onClick={() => setQ("")}>Clear</Button>
          </div>
          {promosQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No promotions found.</div>
          ) : (
            <div className="overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Value</th>
                    <th className="px-3 py-2">Valid</th>
                    <th className="px-3 py-2">Uses</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const startAt = p.start_at ? new Date(p.start_at).toLocaleDateString() : "—";
                    const endAt = p.end_at ? new Date(p.end_at).toLocaleDateString() : "—";
                    const valueLabel = p.type === "percent" ? `${p.value}%` : p.type === "free" ? "FREE" : `₱${p.value}`;
                    const usesLabel = p.redemptions_count != null ? `${p.redemptions_count}/${p.max_redemptions ?? "∞"}` : p.max_redemptions != null ? `0/${p.max_redemptions}` : "—";
                    return (
                      <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{p.code}</td>
                        <td className="px-3 py-2 uppercase">{p.type}</td>
                        <td className="px-3 py-2">{valueLabel}</td>
                        <td className="px-3 py-2">
                          {startAt} – {endAt}
                        </td>
                        <td className="px-3 py-2">{usesLabel}</td>
                        <td className="px-3 py-2">
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm(`Delete promotion ${p.code}?`)) {
                                  deleteM.mutate(p.id);
                                }
                              }}
                              disabled={deleteM.isPending}
                            >
                              Delete
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {(promosQ.isError || deleteM.isError) && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm">
              {(promosQ.error as any)?.message ?? (deleteM.error as any)?.message ?? "Failed to load promotions"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MerchantPromotionsPage;