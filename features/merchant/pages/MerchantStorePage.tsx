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
  merchantUpdateStore,
  merchantUpdateStoreStatus,
  merchantUpdateStoreHours,
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

  const [draft, setDraft] = useState<Partial<MerchantStore>>({});

  useEffect(() => {
    if (storeQ.data) {
      setDraft({
        name: storeQ.data.name,
        description: storeQ.data.description ?? "",
        address: storeQ.data.address ?? "",
      });
    }
  }, [storeQ.data]);

  const updateM = useMutation({
    mutationFn: async () =>
      merchantUpdateStore(String(token), {
        name: String(draft.name ?? "").trim(),
        description: String(draft.description ?? "").trim() || null,
        address: String(draft.address ?? "").trim() || null,
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
            {(storeQ.isError || statusM.isError) && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                {(storeQ.error as any)?.message ?? (statusM.error as any)?.message ?? "Request failed"}
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

      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        Approval: {String(s?.approval_status ?? "—")} · Store ID: {String(s?.id ?? "—")}
      </div>
    </div>
  );
}
