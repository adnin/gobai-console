import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import {
  merchantStore,
  merchantListStoreDrivers,
  merchantAddStoreDriver,
  merchantUpdateStore,
  merchantUpdateStoreStatus,
  merchantUpdateStoreHours,
  merchantPauseStore,
  merchantResumeStore,
  MerchantStore,
} from "@/features/merchant/api/merchantApi";
import { MerchantTabs } from "@/features/merchant/components/MerchantTabs";

export function MerchantStorePage() {
  const { token } = useAuth();
  const qc = useQueryClient();

  const storeQ = useQuery({
    queryKey: ["merchant", "store"],
    queryFn: async () => merchantStore(String(token)),
    enabled: !!token,
  });

  const storeDriversQ = useQuery({
    queryKey: ["merchant", "store", "drivers"],
    queryFn: async () => merchantListStoreDrivers(String(token)),
    enabled: !!token,
  });

  const [draft, setDraft] = useState<Partial<MerchantStore>>({});
  const [driverIdInput, setDriverIdInput] = useState("");
  const [restrictOnlyMyDrivers, setRestrictOnlyMyDrivers] = useState(false);
  const [restrictError, setRestrictError] = useState<string | null>(null);

  useEffect(() => {
    if (storeQ.data) {
      setDraft({
        name: storeQ.data.name,
        description: storeQ.data.description ?? "",
        address: storeQ.data.address ?? "",
      });
      setRestrictOnlyMyDrivers(Boolean(storeQ.data.restrict_dispatch_to_store_drivers));
    }
  }, [storeQ.data]);

  const updateM = useMutation({
    mutationFn: async () =>
      merchantUpdateStore(String(token), {
        name: String(draft.name ?? "").trim(),
        description: String(draft.description ?? "").trim() || null,
        address: String(draft.address ?? "").trim() || null,
        default_prep_time_min: draft.default_prep_time_min,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "store"] });
    },
  });

  const statusM = useMutation({
    mutationFn: async (status: string) => merchantUpdateStoreStatus(String(token), status as any),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "store"] });
    },
  });

  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");

  useEffect(() => {
    if (storeQ.data) {
      setOpenTime(String(storeQ.data.open_time ?? ""));
      setCloseTime(String(storeQ.data.close_time ?? ""));
    }
  }, [storeQ.data]);

  const hoursM = useMutation({
    mutationFn: async () => merchantUpdateStoreHours(String(token), { open_time: openTime || null, close_time: closeTime || null }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "store"] });
    },
  });

  const [pauseReason, setPauseReason] = useState("");
  const [pauseNotes, setPauseNotes] = useState("");

  const pauseM = useMutation({
    mutationFn: async () => merchantPauseStore(String(token), { reason: pauseReason.trim(), notes: pauseNotes.trim() || null }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "store"] });
      setPauseReason("");
      setPauseNotes("");
    },
  });

  const resumeM = useMutation({
    mutationFn: async () => merchantResumeStore(String(token)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "store"] });
    },
  });

  const addDriverM = useMutation({
    mutationFn: async (driverId: number) => merchantAddStoreDriver(String(token), driverId),
    onSuccess: async () => {
      setDriverIdInput("");
      await qc.invalidateQueries({ queryKey: ["merchant", "store", "drivers"] });
      await qc.invalidateQueries({ queryKey: ["merchant", "store"] });
    },
  });

  const restrictM = useMutation({
    mutationFn: async (value: boolean) =>
      merchantUpdateStore(String(token), { restrict_dispatch_to_store_drivers: value }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "store"] });
    },
    onError: async () => {
      await qc.invalidateQueries({ queryKey: ["merchant", "store"] });
    },
  });

  const storeDrivers = storeDriversQ.data?.data ?? [];

  const handleRestrictChange = (value: boolean) => {
    if (value && storeDrivers.length === 0) {
      setRestrictError("Add a driver before enabling restricted dispatch.");
      return;
    }

    setRestrictError(null);
    const previous = restrictOnlyMyDrivers;
    setRestrictOnlyMyDrivers(value);
    restrictM.mutate(value, {
      onError: () => setRestrictOnlyMyDrivers(previous),
    });
  };

  const restrictErrorMessage = restrictError ?? (restrictM.error as any)?.message ?? null;

  const s = storeQ.data;

  return (
    <div className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Store</div>
          <div className="text-sm text-muted-foreground">Basic profile + open/close controls.</div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm"><Link to="/merchant">Orders</Link></Button>
          <Button variant="secondary" size="sm" onClick={() => storeQ.refetch()} disabled={storeQ.isFetching}>
            {storeQ.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <MerchantTabs />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current</span>
              <span className="font-semibold">{String(s?.status ?? "—")}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => statusM.mutate("open")} disabled={statusM.isPending}>
                Open
              </Button>
              <Button variant="secondary" onClick={() => statusM.mutate("closed")} disabled={statusM.isPending}>
                Close
              </Button>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              Closing your store reduces cancellations when you’re offline.
            </div>
            {s?.is_paused && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <div className="text-sm font-medium text-yellow-800">Store is paused</div>
                {s.pause_reason && <div className="text-xs text-yellow-700 mt-1">Reason: {s.pause_reason}</div>}
                {s.pause_expires_at && <div className="text-xs text-yellow-700">Resumes: {new Date(s.pause_expires_at).toLocaleString()}</div>}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => resumeM.mutate()}
                  disabled={resumeM.isPending}
                  className="mt-2"
                >
                  {resumeM.isPending ? "Resuming…" : "Resume Now"}
                </Button>
              </div>
            )}
            {!s?.is_paused && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Pause temporarily:</div>
                <Input
                  placeholder="Reason for pause (required)"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="text-xs"
                />
                <Input
                  placeholder="Additional notes (optional)"
                  value={pauseNotes}
                  onChange={(e) => setPauseNotes(e.target.value)}
                  className="text-xs"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => pauseM.mutate()}
                  disabled={pauseM.isPending || !pauseReason.trim()}
                >
                  {pauseM.isPending ? "Pausing…" : "Pause Store"}
                </Button>
              </div>
            )}
            {(storeQ.isError || statusM.isError || pauseM.isError || resumeM.isError) && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                {(storeQ.error as any)?.message ?? (statusM.error as any)?.message ?? (pauseM.error as any)?.message ?? (resumeM.error as any)?.message ?? "Request failed"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Name</div>
              <Input value={String(draft.name ?? "")} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Description</div>
              <Input value={String(draft.description ?? "")} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="optional" />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Address</div>
              <Input value={String(draft.address ?? "")} onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))} placeholder="optional" />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Default Prep Time (minutes)</div>
              <Input
                type="number"
                min="1"
                max="120"
                value={String(draft.default_prep_time_min ?? "")}
                onChange={(e) => setDraft((d) => ({ ...d, default_prep_time_min: Number(e.target.value) || undefined }))}
                placeholder="e.g., 15"
              />
            </div>

            <Button onClick={() => updateM.mutate()} disabled={updateM.isPending || String(draft.name ?? "").trim().length < 2}>
              {updateM.isPending ? "Saving…" : "Save"}
            </Button>

            {updateM.isError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                {(updateM.error as any)?.message ?? "Save failed"}
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Open time</div>
                <Input value={openTime} onChange={(e) => setOpenTime(e.target.value)} placeholder="08:00" />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Close time</div>
                <Input value={closeTime} onChange={(e) => setCloseTime(e.target.value)} placeholder="21:00" />
              </div>
            </div>
            <Button variant="secondary" onClick={() => hoursM.mutate()} disabled={hoursM.isPending}>
              {hoursM.isPending ? "Updating…" : "Update hours"}
            </Button>
            {hoursM.isError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                {(hoursM.error as any)?.message ?? "Update failed"}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Hours are informational (for customers). Store status controls accept/cancel behavior.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Store drivers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Dispatch preference</div>
              <div className="text-xs text-muted-foreground">
                Toggle this to stop falling back to marketplace drivers. The system will first try your own riders and stop if none are available.
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={restrictOnlyMyDrivers}
                onChange={(e) => handleRestrictChange(e.target.checked)}
                disabled={restrictM.isPending || (storeDrivers.length === 0 && !restrictOnlyMyDrivers)}
                className="h-4 w-4 rounded border border-border bg-background"
              />
              <span>Restrict dispatch to store drivers</span>
            </label>
          </div>
          {restrictErrorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {restrictErrorMessage}
            </div>
          ) : null}
          <div className="space-y-2">
            {storeDriversQ.isLoading ? (
              <div className="text-xs text-muted-foreground">Loading roster...</div>
            ) : storeDriversQ.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {(storeDriversQ.error as any)?.message ?? "Failed to load drivers"}
              </div>
            ) : storeDrivers.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No merchant drivers yet. Add one below to start restricting dispatch.
              </div>
            ) : (
              storeDrivers.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/50 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {entry.driver?.name ?? `Driver #${entry.driver_id}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.driver?.email ?? entry.driver?.mobile ?? `User ID ${entry.driver_id}`}
                    </div>
                  </div>
                  <div className="flex flex-col items-end text-right text-xs text-muted-foreground">
                    {entry.driver?.status ? (
                      <span className="capitalize">{entry.driver.status}</span>
                    ) : null}
                    {entry.created_at ? (
                      <span>{new Date(entry.created_at).toLocaleString()}</span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              type="number"
              min="1"
              placeholder="Driver user ID"
              value={driverIdInput}
              onChange={(e) => setDriverIdInput(e.target.value)}
              disabled={addDriverM.isPending}
            />
            <Button
              variant="secondary"
              onClick={() => {
                const id = Number(driverIdInput);
                if (!Number.isFinite(id) || id <= 0) return;
                addDriverM.mutate(id);
              }}
              disabled={addDriverM.isPending || !driverIdInput.trim()}
            >
              {addDriverM.isPending ? "Adding..." : "Add driver"}
            </Button>
          </div>
          {addDriverM.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {(addDriverM.error as any)?.message ?? "Failed to add driver"}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        Approval: {String(s?.approval_status ?? "—")} · Store ID: {String(s?.id ?? "—")}
      </div>
    </div>
  );
}
