import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  financePromotionsList,
  financePromotionsOverview,
  type FinancePromotion,
  type FinancePromotionsOverview,
} from "@/features/finance/api/financePromotionApi";

/**
 * FinancePromotionsPage
 *
 * Presents an overview of marketing promotions from a finance perspective. Shows totals such as
 * how many promotions exist, how many redemptions were made and the total discount value given
 * out. A searchable table lists each promotion with its metrics.
 */
export function FinancePromotionsPage() {
  const { token } = useAuth();

  const overviewQ = useQuery({
    queryKey: ["finance", "promotions", "overview"],
    queryFn: async () => financePromotionsOverview(String(token)),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const listQ = useQuery({
    queryKey: ["finance", "promotions", "list"],
    queryFn: async () => financePromotionsList(String(token)),
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  const [q, setQ] = React.useState("");

  const promos: FinancePromotion[] = Array.isArray((listQ.data as any)?.data)
    ? (listQ.data as any).data
    : [];

  const filtered = promos.filter((p) => {
    if (!q.trim()) return true;
    return p.code.toLowerCase().includes(q.trim().toLowerCase());
  });

  const overview: FinancePromotionsOverview | null = overviewQ.data ?? null;

  const n = (x: any) => {
    const v = Number(x ?? 0);
    return Number.isFinite(v) ? v.toLocaleString() : "—";
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Promotions analysis</div>
          <div className="text-sm text-muted-foreground">Marketing impact and promo usage stats.</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={overviewQ.isError ? "secondary" : "default"}>
            {overviewQ.isLoading ? "Loading…" : overviewQ.isError ? "Error" : "Live"}
          </Badge>
          <Button asChild variant="secondary" size="sm">
            <Link to="/finance">Back to Finance</Link>
          </Button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total promotions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {overviewQ.isLoading ? "—" : n(overview?.total_promotions)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total redemptions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {overviewQ.isLoading ? "—" : n(overview?.total_redemptions)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total discount given</CardTitle>
            <div className="text-sm text-muted-foreground">Points value</div>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {overviewQ.isLoading ? "—" : `₱${n(overview?.total_discount_given)}`}
          </CardContent>
        </Card>
      </div>

      {/* Promotions list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Promotions list</CardTitle>
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
          {listQ.isLoading ? (
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
                    <th className="px-3 py-2">Redemptions</th>
                    <th className="px-3 py-2">Total discount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const valueLabel = p.type === "percent" ? `${p.value}%` : p.type === "free" ? "FREE" : `₱${p.value}`;
                    const uses = p.redemptions_count != null ? n(p.redemptions_count) : "—";
                    const disc = p.total_discount_given != null ? `₱${n(p.total_discount_given)}` : "—";
                    return (
                      <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{p.code}</td>
                        <td className="px-3 py-2 uppercase">{p.type}</td>
                        <td className="px-3 py-2">{valueLabel}</td>
                        <td className="px-3 py-2">{uses}</td>
                        <td className="px-3 py-2">{disc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {listQ.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm">
              {(listQ.error as any)?.message ?? "Failed to load promotions"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default FinancePromotionsPage;