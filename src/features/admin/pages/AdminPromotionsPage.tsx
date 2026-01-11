import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";

import {
  adminPromoBrainDiagnose,
  adminPromoBrainRun,
  adminPromoBrainRuns,
  type PromoBrainRunRow,
} from "@/features/admin/api/adminPromoBrainApi";

import {
  adminManualPromotionsCreate,
  adminManualPromotionsDelete,
  adminManualPromotionsDisable,
  adminManualPromotionsList,
  type ManualPromotion,
} from "@/features/admin/api/adminManualPromotionsApi";

type BrainSlot = "am" | "pm";
type FlowType = "transport" | "parcel" | "store";

function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function toInt(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function formatDateTime(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatDateShort(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function nowMs(): number {
  return Date.now();
}

function computeDerivedStatus(
  p: ManualPromotion
): "active" | "scheduled" | "expired" | "disabled" | "inactive" {
  const status = String(p.status || "").toLowerCase();

  if (status === "disabled" || p.disabled_at) return "disabled";

  const starts = p.starts_at ? new Date(p.starts_at).getTime() : null;
  const ends = p.ends_at ? new Date(p.ends_at).getTime() : null;
  const t = nowMs();

  if (starts != null && Number.isFinite(starts) && starts > t)
    return "scheduled";
  if (ends != null && Number.isFinite(ends) && ends < t) return "expired";

  if (status === "active") return "active";
  return "inactive";
}

function getClaimsCount(p: ManualPromotion): number | null {
  const raw = p.claims_count ?? p.total_claims ?? p.redemptions_count ?? null;

  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

export function AdminPromotionsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  // ------------------------------------------------------------
  // Promo Brain (admin-only) — run history + diagnostics
  // ------------------------------------------------------------
  const [brainSlot, setBrainSlot] = React.useState<BrainSlot>("am");
  const [brainDryRun, setBrainDryRun] = React.useState<boolean>(true);
  const [brainForce, setBrainForce] = React.useState<boolean>(false);

  const brainRunsQ = useQuery({
    queryKey: ["admin", "promo-brain", "runs"],
    queryFn: async () => adminPromoBrainRuns(String(token), 30),
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  const brainRunM = useMutation({
    mutationFn: async () =>
      adminPromoBrainRun(String(token), {
        slot: brainSlot,
        dry_run: brainDryRun,
        force: brainForce,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["admin", "promo-brain", "runs"],
      });
    },
  });

  const brainRuns: PromoBrainRunRow[] = safeArray<PromoBrainRunRow>(
    (brainRunsQ.data as any)?.data
  );
  const latestRun = brainRuns[0] ?? null;

  // Diagnose tool
  const [diagUserId, setDiagUserId] = React.useState<string>("");
  const [diagFlow, setDiagFlow] = React.useState<FlowType>("transport");
  const [diagFee, setDiagFee] = React.useState<string>("20");
  const [diagPromoCode, setDiagPromoCode] = React.useState<string>("");
  const [diagBundleKey, setDiagBundleKey] = React.useState<string>("");
  const [diagAutoApply, setDiagAutoApply] = React.useState<boolean>(true);

  const diagM = useMutation({
    mutationFn: async () =>
      adminPromoBrainDiagnose(String(token), {
        user_id: toInt(diagUserId),
        flow_type: diagFlow,
        platform_fee_points: toInt(diagFee),
        promo_code: diagPromoCode.trim() || null,
        bundle_key: diagBundleKey.trim() || null,
        auto_apply: diagAutoApply,
      }),
  });

  const diagResult = diagM.data as any;
  const diagAssignments = safeArray<any>(diagResult?.assignments);

  // ------------------------------------------------------------
  // Manual Promotions (codes) — admin CRUD + transparency
  // ------------------------------------------------------------
  const manualQ = useQuery({
    queryKey: ["admin", "manual-promotions"],
    queryFn: async () => adminManualPromotionsList(String(token)),
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  const manualPromos: ManualPromotion[] = safeArray<ManualPromotion>(
    (manualQ.data as any)?.data
  );

  const manualCounts = React.useMemo(() => {
    const c = {
      total: 0,
      active: 0,
      scheduled: 0,
      expired: 0,
      disabled: 0,
      inactive: 0,
    };
    c.total = manualPromos.length;

    for (const p of manualPromos) {
      const s = computeDerivedStatus(p);
      c[s] += 1;
    }
    return c;
  }, [manualPromos]);

  const [mpQ, setMpQ] = React.useState<string>("");

  const manualFiltered = React.useMemo(() => {
    const q = mpQ.trim().toLowerCase();
    if (!q) return manualPromos;
    return manualPromos.filter((p) =>
      String(p.code || "")
        .toLowerCase()
        .includes(q)
    );
  }, [manualPromos, mpQ]);

  // Create form state
  const [mCode, setMCode] = React.useState<string>("");
  const [mType, setMType] = React.useState<"fixed_points" | "percent">(
    "fixed_points"
  );
  const [mValue, setMValue] = React.useState<string>("");
  const [mStarts, setMStarts] = React.useState<string>("");
  const [mEnds, setMEnds] = React.useState<string>("");
  const [mMax, setMMax] = React.useState<string>("");
  const [mPerUser, setMPerUser] = React.useState<string>("1");

  const createManualM = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: mCode.trim().toUpperCase(),
        discount_type: mType,
        discount_value: toInt(mValue),
      };

      if (mStarts.trim()) payload.starts_at = mStarts.trim();
      if (mEnds.trim()) payload.ends_at = mEnds.trim();

      if (mMax.trim()) payload.max_redemptions = toInt(mMax);
      if (mPerUser.trim()) payload.per_user_limit = toInt(mPerUser);

      return adminManualPromotionsCreate(String(token), payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "manual-promotions"] });
      setMCode("");
      setMValue("");
      setMStarts("");
      setMEnds("");
      setMMax("");
      setMPerUser("1");
    },
  });

  const disableManualM = useMutation({
    mutationFn: async (id: number) =>
      adminManualPromotionsDisable(String(token), id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "manual-promotions"] });
    },
  });

  const deleteManualM = useMutation({
    mutationFn: async (id: number) =>
      adminManualPromotionsDelete(String(token), id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "manual-promotions"] });
    },
  });

  const canCreateManual = mCode.trim().length >= 2 && toInt(mValue) > 0;

  return (
    <div className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Promotions</div>
          <div className="text-sm text-muted-foreground">
            Admin visibility for Promo Brain runs + diagnostics + manual promo
            codes.
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/admin">Back to Home</Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              brainRunsQ.refetch();
              manualQ.refetch();
            }}
            disabled={brainRunsQ.isFetching || manualQ.isFetching}
          >
            {brainRunsQ.isFetching || manualQ.isFetching
              ? "Refreshing…"
              : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ---------------- Promo Brain ---------------- */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Promo Brain</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Admin-only</Badge>
            <Badge variant={brainDryRun ? "secondary" : "default"}>
              {brainDryRun ? "Dry-run" : "Publish"}
            </Badge>
            {brainForce && <Badge variant="danger">Force</Badge>}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Slot</div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={brainSlot === "am" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setBrainSlot("am")}
                >
                  AM
                </Button>
                <Button
                  type="button"
                  variant={brainSlot === "pm" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setBrainSlot("pm")}
                >
                  PM
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Mode</div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={brainDryRun ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setBrainDryRun(true)}
                >
                  Dry-run
                </Button>
                <Button
                  type="button"
                  variant={!brainDryRun ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setBrainDryRun(false)}
                >
                  Publish
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Run</div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => brainRunM.mutate()}
                  disabled={brainRunM.isPending || !token}
                >
                  {brainRunM.isPending ? "Running…" : "Run Promo Brain"}
                </Button>
                <Button
                  type="button"
                  variant={brainForce ? "danger" : "secondary"}
                  onClick={() => setBrainForce((v) => !v)}
                >
                  {brainForce ? "Force: ON" : "Force: OFF"}
                </Button>
              </div>
            </div>
          </div>

          {(brainRunM.isError || brainRunsQ.isError) && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
              {(brainRunM.error as any)?.message ??
                (brainRunsQ.error as any)?.message ??
                "Promo Brain request failed"}
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Latest run</div>
              {!latestRun ? (
                <div className="text-sm text-muted-foreground">
                  No runs found.
                </div>
              ) : (
                <div className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">
                      #{latestRun.id} · {latestRun.run_date} ·{" "}
                      {String(latestRun.slot).toUpperCase()}
                    </div>
                    <Badge
                      variant={
                        latestRun.status === "completed"
                          ? "secondary"
                          : "danger"
                      }
                    >
                      {latestRun.status}
                    </Badge>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Published items
                      </div>
                      <div>
                        {Array.isArray(latestRun.published?.items)
                          ? latestRun.published.items.length
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Dropped
                      </div>
                      <div>
                        {Array.isArray(latestRun.snapshot?.candidates?.dropped)
                          ? latestRun.snapshot.candidates.dropped.length
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <details className="mt-2 rounded-md border bg-muted/30 p-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Raw latest run
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto text-xs">
                      {JSON.stringify(latestRun, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Diagnose a customer</div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground">
                    Customer user_id
                  </label>
                  <Input
                    value={diagUserId}
                    onChange={(e) => setDiagUserId(e.target.value)}
                    placeholder="e.g. 123"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Platform fee points
                  </label>
                  <Input
                    value={diagFee}
                    onChange={(e) => setDiagFee(e.target.value)}
                    placeholder="e.g. 20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground">Flow</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        diagFlow === "transport" ? "default" : "secondary"
                      }
                      onClick={() => setDiagFlow("transport")}
                    >
                      Transport
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={diagFlow === "parcel" ? "default" : "secondary"}
                      onClick={() => setDiagFlow("parcel")}
                    >
                      Parcel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={diagFlow === "store" ? "default" : "secondary"}
                      onClick={() => setDiagFlow("store")}
                    >
                      Store
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Mode</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={diagAutoApply ? "default" : "secondary"}
                      onClick={() => setDiagAutoApply(true)}
                    >
                      Auto-apply
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={!diagAutoApply ? "default" : "secondary"}
                      onClick={() => setDiagAutoApply(false)}
                    >
                      Manual
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground">
                    Promo code (optional)
                  </label>
                  <Input
                    value={diagPromoCode}
                    onChange={(e) => setDiagPromoCode(e.target.value)}
                    placeholder="WELCOME-XXXX"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Bundle key (optional)
                  </label>
                  <Input
                    value={diagBundleKey}
                    onChange={(e) => setDiagBundleKey(e.target.value)}
                    placeholder="BUNDLE_RIDE_5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  onClick={() => diagM.mutate()}
                  disabled={diagM.isPending || !token || !diagUserId.trim()}
                >
                  {diagM.isPending ? "Checking…" : "Diagnose"}
                </Button>
                <div className="text-xs text-muted-foreground">
                  Shows preview + assignments. Useful for “why no promo?”
                </div>
              </div>

              {diagM.isError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                  {(diagM.error as any)?.message ?? "Diagnose failed"}
                </div>
              )}

              {diagResult ? (
                <div className="space-y-2">
                  <details className="rounded-md border bg-muted/30 p-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Raw diagnose JSON
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto text-xs">
                      {JSON.stringify(diagResult, null, 2)}
                    </pre>
                  </details>

                  <details className="rounded-md border p-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      Last assignments ({diagAssignments.length})
                    </summary>
                    <div className="mt-2 overflow-auto rounded-md border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40">
                          <tr className="text-left">
                            <th className="px-2 py-2">id</th>
                            <th className="px-2 py-2">run</th>
                            <th className="px-2 py-2">control</th>
                            <th className="px-2 py-2">voucher</th>
                            <th className="px-2 py-2">campaign</th>
                            <th className="px-2 py-2">assigned</th>
                            <th className="px-2 py-2">expires</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diagAssignments.slice(0, 10).map((a) => (
                            <tr
                              key={a.id}
                              className="border-t hover:bg-muted/20"
                            >
                              <td className="px-2 py-2">{a.id}</td>
                              <td className="px-2 py-2">
                                {a.run_date} {String(a.slot).toUpperCase()}
                              </td>
                              <td className="px-2 py-2">
                                {a.is_control ? "YES" : "NO"}
                              </td>
                              <td className="px-2 py-2">
                                {a.voucher_id ?? "—"}
                              </td>
                              <td className="px-2 py-2">
                                {a.campaign_id ?? "—"}
                              </td>
                              <td className="px-2 py-2">
                                {formatDateTime(a.assigned_at)}
                              </td>
                              <td className="px-2 py-2">
                                {formatDateTime(a.expires_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              ) : null}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">Recent runs</div>
            {brainRuns.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No run history yet.
              </div>
            ) : (
              <div className="space-y-2">
                {brainRuns.slice(0, 8).map((r) => (
                  <details key={r.id} className="rounded-md border">
                    <summary className="cursor-pointer list-none p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm">
                          <span className="font-medium">#{r.id}</span> ·{" "}
                          {r.run_date} · {String(r.slot).toUpperCase()}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              r.status === "completed" ? "secondary" : "danger"
                            }
                          >
                            {r.status}
                          </Badge>
                          <Badge variant="secondary">
                            items:{" "}
                            {Array.isArray(r.published?.items)
                              ? r.published.items.length
                              : 0}
                          </Badge>
                          <Badge variant="secondary">
                            dropped:{" "}
                            {Array.isArray(r.snapshot?.candidates?.dropped)
                              ? r.snapshot.candidates.dropped.length
                              : 0}
                          </Badge>
                        </div>
                      </div>
                    </summary>
                    <div className="p-2 pt-0">
                      <pre className="max-h-64 overflow-auto rounded-md border bg-muted p-2 text-xs">
                        {JSON.stringify(r, null, 2)}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---------------- Manual Promotions ---------------- */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Manual Promo Codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Admin-only</Badge>
            <Badge variant="secondary">
              Discounts apply to platform fee only
            </Badge>
            <Badge variant="secondary">Integers only (points)</Badge>
          </div>

          <div className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">Summary</div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => manualQ.refetch()}
                disabled={manualQ.isFetching}
              >
                {manualQ.isFetching ? "Refreshing…" : "Refresh codes"}
              </Button>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">total: {manualCounts.total}</Badge>
              <Badge variant="secondary">active: {manualCounts.active}</Badge>
              <Badge variant="secondary">
                scheduled: {manualCounts.scheduled}
              </Badge>
              <Badge variant="secondary">expired: {manualCounts.expired}</Badge>
              <Badge variant="secondary">
                disabled: {manualCounts.disabled}
              </Badge>
            </div>

            {(manualQ.isError ||
              createManualM.isError ||
              disableManualM.isError ||
              deleteManualM.isError) && (
              <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                {(manualQ.error as any)?.message ??
                  (createManualM.error as any)?.message ??
                  (disableManualM.error as any)?.message ??
                  (deleteManualM.error as any)?.message ??
                  "Manual promos request failed"}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">Create manual code</div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Code</label>
                <Input
                  value={mCode}
                  onChange={(e) => setMCode(e.target.value)}
                  placeholder="BLACKFRIDAY"
                />
                <div className="text-xs text-muted-foreground">
                  Customer redeems this code → a voucher is minted.
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Discount type
                </label>
                <select
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={mType}
                  onChange={(e) => setMType(e.target.value as any)}
                >
                  <option value="fixed_points">
                    Fixed points off (platform fee)
                  </option>
                  <option value="percent">Percent off (platform fee)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Discount value
                </label>
                <Input
                  type="number"
                  value={mValue}
                  onChange={(e) => setMValue(e.target.value)}
                  placeholder="e.g. 10 (points) or 50 (%)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Starts at (optional)
                </label>
                <Input
                  type="datetime-local"
                  value={mStarts}
                  onChange={(e) => setMStarts(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Ends at (optional)
                </label>
                <Input
                  type="datetime-local"
                  value={mEnds}
                  onChange={(e) => setMEnds(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Max total redemptions (optional)
                </label>
                <Input
                  type="number"
                  value={mMax}
                  onChange={(e) => setMMax(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Per-user limit
                </label>
                <Input
                  type="number"
                  value={mPerUser}
                  onChange={(e) => setMPerUser(e.target.value)}
                  placeholder="e.g. 1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={() => createManualM.mutate()}
                disabled={!canCreateManual || createManualM.isPending || !token}
              >
                {createManualM.isPending ? "Creating…" : "Create code"}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">Current manual codes</div>

            <div className="flex items-center gap-2">
              <Input
                value={mpQ}
                onChange={(e) => setMpQ(e.target.value)}
                placeholder="Search code"
                className="w-full md:w-64"
              />
              <Button variant="secondary" onClick={() => setMpQ("")}>
                Clear
              </Button>
            </div>

            {manualQ.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : manualFiltered.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No manual promo codes found.
              </div>
            ) : (
              <div className="overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Discount</th>
                      <th className="px-3 py-2">Schedule</th>
                      <th className="px-3 py-2">Limits</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualFiltered.map((p) => {
                      const derived = computeDerivedStatus(p);
                      const claims = getClaimsCount(p);
                      const max = p.max_redemptions ?? null;

                      const discountLabel =
                        p.discount_type === "percent"
                          ? `${p.discount_value}%`
                          : `${p.discount_value} pts`;

                      const scheduleLabel =
                        (p.starts_at ? formatDateShort(p.starts_at) : "—") +
                        " → " +
                        (p.ends_at ? formatDateShort(p.ends_at) : "—");

                      const limitsLabel = [
                        `per-user: ${p.per_user_limit ?? "—"}`,
                        `max: ${max ?? "—"}`,
                        `used: ${claims ?? "—"}`,
                        max != null && claims != null
                          ? `left: ${Math.max(0, max - claims)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");

                      return (
                        <tr
                          key={p.id}
                          className="border-t border-border hover:bg-muted/20"
                        >
                          <td className="px-3 py-2 font-medium">{p.code}</td>
                          <td className="px-3 py-2">{discountLabel}</td>
                          <td className="px-3 py-2">{scheduleLabel}</td>
                          <td className="px-3 py-2">{limitsLabel}</td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={
                                derived === "active"
                                  ? "secondary"
                                  : derived === "scheduled"
                                  ? "secondary"
                                  : derived === "expired"
                                  ? "danger"
                                  : derived === "disabled"
                                  ? "danger"
                                  : "secondary"
                              }
                            >
                              {derived}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            {formatDateShort(p.created_at)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={
                                  disableManualM.isPending ||
                                  derived === "disabled"
                                }
                                onClick={() => {
                                  if (derived === "disabled") return;
                                  if (
                                    window.confirm(`Disable code ${p.code}?`)
                                  ) {
                                    disableManualM.mutate(p.id);
                                  }
                                }}
                              >
                                Disable
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={deleteManualM.isPending}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Delete code ${p.code}? This is permanent.`
                                    )
                                  ) {
                                    deleteManualM.mutate(p.id);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Customers redeem via{" "}
              <span className="font-mono">
                POST /api/v1/customer/promos/redeem-code
              </span>{" "}
              with an <span className="font-mono">Idempotency-Key</span> header.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminPromotionsPage;
