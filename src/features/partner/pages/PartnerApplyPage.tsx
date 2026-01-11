import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getMyOnboarding, partnerApply } from "../api/partnerOnboardingApi";

function StatusChip({ status, className }: { status?: string | null; className?: string }) {
  const s = String(status ?? "").toLowerCase();
  const label = s ? s.toUpperCase() : "N/A";
  const tone =
    s === "approved" ? "bg-emerald-600/15 text-emerald-700 border-emerald-600/20" :
    s === "pending" ? "bg-amber-600/15 text-amber-700 border-amber-600/20" :
    s === "rejected" ? "bg-red-600/15 text-red-700 border-red-600/20" :
    "bg-slate-600/10 text-slate-700 border-slate-600/20";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tone,
        className
      )}
    >
      {label}
    </span>
  );
}

export function PartnerApplyPage() {
  const { token, viewer, refreshMe } = useAuth();
  const qc = useQueryClient();

  const onboardingQ = useQuery({
    queryKey: ["me-onboarding"],
    queryFn: async () => getMyOnboarding(token!),
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  const partnerProfile = onboardingQ.data?.data?.partner_profile ?? null;
  const status = String(partnerProfile?.status ?? "").toLowerCase();

  // ✅ When admin approves, your role changes server-side.
  // Sanctum tokens don't embed roles, so you usually don't need to re-login,
  // you just need to refresh /me and update the local viewer.
  const viewerHasPartnerAccess = (viewer?.roles ?? []).includes("partner_ops");

  React.useEffect(() => {
    if (!token) return;

    // While pending, poll onboarding status.
    if (status === "pending") {
      const t = window.setInterval(() => {
        onboardingQ.refetch();
      }, 10_000);
      return () => window.clearInterval(t);
    }

    // Auto-refresh access once approved.
    if (status === "approved" && !viewerHasPartnerAccess) {
      refreshMe().catch(() => {});
    }
  }, [token, status, viewerHasPartnerAccess]);

  const [businessName, setBusinessName] = React.useState("");
  const [pageUrl, setPageUrl] = React.useState("");
  const [serviceArea, setServiceArea] = React.useState("");
  const [toast, setToast] = React.useState<{ kind: "ok" | "warn" | "err"; text: string } | null>(null);

  React.useEffect(() => {
    // Keep form non-destructive; do not auto-fill from profile (profile only stores business_name etc in API).
  }, [partnerProfile]);

  const applyM = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Not signed in");
      return partnerApply(token, {
        business_name: businessName.trim(),
        facebook_page_url: pageUrl.trim(),
        service_area: serviceArea.trim(),
      });
    },
    onSuccess: async () => {
      setToast({ kind: "ok", text: "Application submitted. Status is now pending review." });
      await qc.invalidateQueries({ queryKey: ["me-onboarding"] });
    },
    onError: (e: any) => {
      const msg = String(e?.message ?? "Failed to submit application");
      setToast({ kind: "err", text: msg });
    },
  });

  const approved = status === "approved";
  const pending = status === "pending";
  const rejected = status === "rejected";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Partner Program</h1>
          <div className="text-sm text-muted-foreground">
            Create a partner fleet account so you can dispatch your own drivers using your system.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">Status</div>
          <StatusChip status={partnerProfile?.status ?? "not_applied"} />
        </div>
      </div>

      {toast && (
        <div
          className={cn(
            "rounded-lg border p-3 text-sm",
            toast.kind === "ok"
              ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-900"
              : toast.kind === "warn"
              ? "border-amber-600/30 bg-amber-600/10 text-amber-900"
              : "border-red-600/30 bg-red-600/10 text-red-900"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>{toast.text}</div>
            <button
              className="text-xs opacity-70 hover:opacity-100"
              onClick={() => setToast(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Apply as a Partner</CardTitle>
          <div className="text-sm text-muted-foreground">
            This is a lightweight application. Admin will approve and then assign drivers & stores to your fleet.
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Business name</div>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Partner Fleet One"
              />
              <div className="text-xs text-muted-foreground">Required.</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Facebook page URL</div>
              <Input
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                placeholder="https://facebook.com/..."
              />
              <div className="text-xs text-muted-foreground">Optional, but helps verification.</div>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <div className="text-sm font-medium">Service area</div>
              <Input
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                placeholder="e.g., Mati City + nearby barangays"
              />
              <div className="text-xs text-muted-foreground">Optional.</div>
            </div>
          </div>

          {rejected && (
            <div className="rounded-lg border border-red-600/30 bg-red-600/5 p-3 text-sm">
              <div className="font-medium">Application rejected</div>
              <div className="text-muted-foreground">
                {partnerProfile?.rejection_reason ? String(partnerProfile.rejection_reason) : "No reason provided."}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                You can update the info and re-submit to set the status back to pending.
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Signed in as <span className="font-medium">{viewer?.name ?? `User #${viewer?.id ?? ""}`}</span>
            </div>

            <div className="flex gap-2">
              {approved ? (
                <>
                  {!viewerHasPartnerAccess ? (
                    <Button onClick={() => refreshMe()} disabled={onboardingQ.isFetching}>
                      Refresh access
                    </Button>
                  ) : (
                    <a
                      href="/partner/dispatch"
                      className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
                    >
                      Open Partner Dispatch
                    </a>
                  )}
                </>
              ) : (
                <Button
                  disabled={!businessName.trim() || applyM.isPending || onboardingQ.isFetching}
                  onClick={() => applyM.mutate()}
                >
                  {pending ? "Update & Re-submit" : "Submit application"}
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={() => onboardingQ.refetch()}
                disabled={onboardingQ.isFetching}
              >
                Refresh status
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">What happens next</div>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Admin reviews your application.</li>
              <li>If approved, your account becomes <span className="font-medium">partner ops</span>.</li>
              <li>Admin assigns drivers and (optionally) stores to your fleet.</li>
              <li>You can dispatch only your own drivers and earn partner commission automatically.</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div>
            If you just got approved but can’t access partner dispatch yet, hit <span className="font-medium">Refresh access</span>. (No need to re-login.)
          </div>
          <div>
            If your status is pending for a long time, ask admin to open <span className="font-medium">Admin → Partner Applications</span> and approve you.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
