import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ban, Clipboard, RefreshCw, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/ui/toast/ToastProvider";
import { useAdminOrderTimeline, useForceCancelOrder, useReassignDriver, useUnassignDriver } from "../hooks";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/rbac";
import type { OrderTimelineEntry } from "../types";

const ALLOWED_ROLES: Role[] = ["admin", "ops", "system"];

function hasAccess(roles: Role[] | undefined | null) {
  return (roles ?? []).some((r) => ALLOWED_ROLES.includes(r));
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatMetaValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function MetaGrid({ meta }: { meta?: Record<string, unknown> }) {
  const entries = meta ? Object.entries(meta) : [];
  if (!entries.length) {
    return <div className="text-xs text-muted-foreground">No metadata</div>;
  }

  return (
    <dl className="grid gap-2 md:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-start justify-between gap-3">
          <dt className="text-xs font-medium uppercase text-muted-foreground">{key}</dt>
          <dd className="flex-1 text-right text-sm text-foreground break-all">{formatMetaValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} aria-label={label}>
      <Clipboard className="mr-1 h-4 w-4" />
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function TimelineList({ items }: { items: OrderTimelineEntry[] }) {
  const sorted = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
      const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
      return tb - ta;
    });
  }, [items]);

  return (
    <ol className="space-y-3">
      {sorted.map((entry, idx) => (
        <li key={entry.id || entry.timestamp || idx} className="rounded-lg border border-border bg-card/60 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{entry.type || "event"}</Badge>
              {entry.id ? <CopyButton value={entry.id} label={`Copy timeline entry ${entry.id}`} /> : null}
            </div>
            <div className="text-sm text-muted-foreground">{formatDateTime(entry.timestamp)}</div>
          </div>
          <div className="mt-3">
            <MetaGrid meta={entry.meta} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function parseId(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function AdminOrderTimelinePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { viewer } = useAuth();
  const allowed = hasAccess(viewer?.roles);
  const timelineQuery = useAdminOrderTimeline(orderId, allowed);
  const timeline = timelineQuery.data?.data?.timeline ?? [];
  const isUnauthorized = timelineQuery.error && (timelineQuery.error as any)?.status === 403;
  const forceCancel = useForceCancelOrder(orderId);
  const [showCancel, setShowCancel] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const reassign = useReassignDriver(orderId);
  const [showReassign, setShowReassign] = React.useState(false);
  const [driverId, setDriverId] = React.useState("");
  const [note, setNote] = React.useState("");
  const unassign = useUnassignDriver(orderId);
  const [showUnassign, setShowUnassign] = React.useState(false);
  const [unassignReason, setUnassignReason] = React.useState("");
  const [unassignNote, setUnassignNote] = React.useState("");
  const toast = useToast();

  const reasonError = (() => {
    const err = forceCancel.error as any;
    if (!err || !err.payload) return null;
    const payload = err.payload as any;
    if (payload?.errors?.reason?.[0]) return String(payload.errors.reason[0]);
    if (payload?.message) return String(payload.message);
    return null;
  })();

  const reassignError = (() => {
    const err = reassign.error as any;
    if (!err || !err.payload) return null;
    const payload = err.payload as any;
    if (payload?.errors?.driver_id?.[0]) return String(payload.errors.driver_id[0]);
    if (payload?.message) return String(payload.message);
    return null;
  })();

  const unassignError = (() => {
    const err = unassign.error as any;
    if (!err || !err.payload) return null;
    const payload = err.payload as any;
    if (payload?.errors?.reason?.[0]) return String(payload.errors.reason[0]);
    if (payload?.message) return String(payload.message);
    return null;
  })();

  const handleForceCancel = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    try {
      await forceCancel.mutateAsync(trimmed);
      toast.ok("Order force-cancelled");
      setShowCancel(false);
      setReason("");
      await timelineQuery.refetch();
    } catch (err) {
      toast.apiErr(err, "Force-cancel failed");
    }
  };

  const handleUnassign = async () => {
    const trimmed = unassignReason.trim();
    if (!trimmed) return;
    try {
      await unassign.mutateAsync({ reason: trimmed, note: unassignNote.trim() || null });
      toast.ok("Driver unassigned");
      setShowUnassign(false);
      setUnassignReason("");
      setUnassignNote("");
      await timelineQuery.refetch();
    } catch (err) {
      toast.apiErr(err, "Unassign failed");
    }
  };

  const handleReassign = async () => {
    const parsedId = parseId(driverId);
    if (!parsedId) return;
    try {
      await reassign.mutateAsync({ driver_id: parsedId, note: note.trim() || null });
      toast.ok("Driver reassigned");
      setShowReassign(false);
      setDriverId("");
      setNote("");
      await timelineQuery.refetch();
    } catch (err) {
      toast.apiErr(err, "Reassign failed");
    }
  };

  if (!orderId) {
    return (
      <div className="p-6">
        <EmptyState
          title="Order not specified"
          description="No order ID was provided."
          icon={Ban}
          actions={
            <Button asChild>
              <Link to="/admin/orders">Back to search</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <EmptyState
          title="Access restricted"
          description="You need admin or ops access to view timelines."
          icon={Ban}
          actions={
            <Button asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="p-6">
        <EmptyState
          title="Not permitted"
          description="Your role cannot access this order timeline."
          icon={Ban}
          actions={
            <Button asChild>
              <Link to="/ops">Go to Ops Dispatch</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/orders">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to search
            </Link>
          </Button>
          <Badge variant="outline">Order #{orderId}</Badge>
          <CopyButton value={orderId} label={`Copy order ${orderId}`} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => timelineQuery.refetch()} disabled={timelineQuery.isFetching}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCancel(true)}
              disabled={forceCancel.isPending}
            >
              Force cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowReassign(true)}
              disabled={reassign.isPending}
            >
              Reassign driver
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnassign(true)}
              disabled={unassign.isPending}
            >
              Unassign driver
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Order Timeline</CardTitle>
            <div className="text-sm text-muted-foreground">Canonical sequence of order events.</div>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <History className="h-4 w-4" />
            Canonical
          </Badge>
        </CardHeader>
        <CardContent>
          {timelineQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="h-16 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : timelineQuery.isError ? (
            <EmptyState
              title="Unable to load timeline"
              description={(timelineQuery.error as Error)?.message ?? "Please retry."}
              icon={Ban}
              actions={
                <Button onClick={() => timelineQuery.refetch()} disabled={timelineQuery.isFetching}>
                  Try again
                </Button>
              }
            />
          ) : timeline.length === 0 ? (
            <EmptyState
              title="No timeline entries"
              description="This order has no recorded events yet."
              icon={History}
              actions={
                <Button variant="secondary" onClick={() => timelineQuery.refetch()} disabled={timelineQuery.isFetching}>
                  Refresh
                </Button>
              }
            />
          ) : (
            <TimelineList items={timeline} />
          )}
        </CardContent>
      </Card>

        {showCancel ? (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => (!forceCancel.isPending ? setShowCancel(false) : null)} />
            <div className="absolute inset-0 flex items-start justify-center overflow-auto p-4">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b border-border p-4">
                  <div>
                    <div className="text-base font-semibold">Force-cancel order #{orderId}</div>
                    <div className="text-sm text-muted-foreground">Irreversible action. Driver assignment and dispatch will stop.</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)} disabled={forceCancel.isPending}>
                    Close
                  </Button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-sm text-muted-foreground">Provide a reason for audit. Minimum 3 characters.</div>
                  <Textarea
                    placeholder="Reason (required)"
                    value={reason}
                    minLength={3}
                    maxLength={200}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={forceCancel.isPending}
                  />
                  {reasonError ? <div className="text-sm text-destructive">{reasonError}</div> : null}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={() => setShowCancel(false)} disabled={forceCancel.isPending}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleForceCancel}
                      disabled={forceCancel.isPending || reason.trim().length < 3}
                    >
                      {forceCancel.isPending ? "Cancelling…" : "Confirm force-cancel"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showReassign ? (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => (!reassign.isPending ? setShowReassign(false) : null)} />
            <div className="absolute inset-0 flex items-start justify-center overflow-auto p-4">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b border-border p-4">
                  <div>
                    <div className="text-base font-semibold">Reassign driver</div>
                    <div className="text-sm text-muted-foreground">Assign a new driver. Previous assignment will be replaced.</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowReassign(false)} disabled={reassign.isPending}>
                    Close
                  </Button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-sm text-muted-foreground">Enter a driver ID and optional note for audit.</div>
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Driver ID (required)"
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    disabled={reassign.isPending}
                  />
                  <Textarea
                    placeholder="Note (optional)"
                    value={note}
                    maxLength={500}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={reassign.isPending}
                  />
                  {reassignError ? <div className="text-sm text-destructive">{reassignError}</div> : null}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={() => setShowReassign(false)} disabled={reassign.isPending}>
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleReassign}
                      disabled={reassign.isPending || !parseId(driverId)}
                    >
                      {reassign.isPending ? "Reassigning…" : "Confirm reassign"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showUnassign ? (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => (!unassign.isPending ? setShowUnassign(false) : null)} />
            <div className="absolute inset-0 flex items-start justify-center overflow-auto p-4">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b border-border p-4">
                  <div>
                    <div className="text-base font-semibold">Unassign driver</div>
                    <div className="text-sm text-muted-foreground">Removes the current driver assignment. Dispatch will need reassignment.</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowUnassign(false)} disabled={unassign.isPending}>
                    Close
                  </Button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-sm text-muted-foreground">Provide a reason for audit (required) and optional note.</div>
                  <Textarea
                    placeholder="Reason (required)"
                    value={unassignReason}
                    minLength={1}
                    maxLength={500}
                    onChange={(e) => setUnassignReason(e.target.value)}
                    disabled={unassign.isPending}
                  />
                  <Textarea
                    placeholder="Note (optional)"
                    value={unassignNote}
                    maxLength={500}
                    onChange={(e) => setUnassignNote(e.target.value)}
                    disabled={unassign.isPending}
                  />
                  {unassignError ? <div className="text-sm text-destructive">{unassignError}</div> : null}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={() => setShowUnassign(false)} disabled={unassign.isPending}>
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleUnassign}
                      disabled={unassign.isPending || unassignReason.trim().length === 0}
                    >
                      {unassign.isPending ? "Unassigning…" : "Confirm unassign"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
    </div>
  );
}
