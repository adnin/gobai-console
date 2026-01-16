import * as React from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useOpsOrders } from "../hooks/useOpsOrders";
import { useOpsDrivers } from "../hooks/useOpsDrivers";
import { usePartnerOrders } from "../hooks/usePartnerOrders";
import { usePartnerDrivers } from "../hooks/usePartnerDrivers";
import { usePartnerOverview } from "../hooks/usePartnerOverview";
import { useAssignDriver } from "../hooks/useAssignDriver";
import { useRedispatchOrder } from "../hooks/useRedispatchOrder";
import { useDispatchRealtime } from "../hooks/useDispatchRealtime";
import { useAuth } from "@/lib/auth";
import { opsCancelOrder, opsReassignOrder } from "../api/opsApi";
import type { DispatchOrder, OpsDriver, OrderDispatchStatus } from "../types";
import { fmtSeconds, haversineKm, isOnline, secondsSince } from "../utils";
import ChatThreadModal from "../components/ChatThreadModal";
import { OfferTimerRing } from "@/components/OfferTimerRing";
import { computeExpiresAt, msRemaining } from "../offer/offerTime";
import {
  AlertTriangle,
  Clock,
  GripVertical,
  MapPin,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  Phone,
  RefreshCw,
  Search,
  Truck,
  Zap,
  X,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import {
  normalizeRealtimeEventType,
  RealtimeEventTypes,
  getRealtimeEventOrderId,
} from "@/lib/realtimeEvents";
import { useNavigate, useSearchParams } from "react-router-dom";

type OfferLite = {
  orderId: number;
  driverId: number;
  status: "pending" | "accepted" | "expired" | "rejected";
  offeredAt: string; // ISO
  expiresAt: string; // ISO
};

function avgFrom(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function sumFrom(nums: number[]): number {
  return nums.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

type ColumnKey = OrderDispatchStatus;

const COLUMNS: { key: ColumnKey; title: string; hint: string }[] = [
  { key: "needs_driver", title: "Needs Driver", hint: "Stuck / timed out" },
  { key: "searching", title: "Searching", hint: "Auto-dispatch running" },
  { key: "offered", title: "Offering", hint: "Offer pending (timer)" },
  { key: "assigned", title: "Assigned", hint: "Driver assigned" },
  { key: "problem", title: "Problem", hint: "Needs attention" },
];

const OPS_OVERRIDE_BUFFER_SEC = 60; // ops cannot override auto-dispatch before this

/**
 * Lane-level SLA budgets (seconds).
 * These represent "best effort" targets for ops awareness.
 * Tune these for your city density.
 */
const LANE_SLA: Record<
  ColumnKey,
  { budgetSec: number; warnSec: number; badSec: number }
> = {
  needs_driver: { budgetSec: 180, warnSec: 120, badSec: 180 },
  searching: { budgetSec: 180, warnSec: 120, badSec: 180 },
  offered: { budgetSec: 120, warnSec: 90, badSec: 120 },
  assigned: { budgetSec: 600, warnSec: 480, badSec: 600 },
  problem: { budgetSec: 120, warnSec: 60, badSec: 120 },
};

type SlaLevel = "good" | "warn" | "bad";

function slaLevelFromSec(sec: number, lane: ColumnKey): SlaLevel {
  const cfg = LANE_SLA[lane] ?? { warnSec: 120, badSec: 180, budgetSec: 180 };
  if (sec >= cfg.badSec) return "bad";
  if (sec >= cfg.warnSec) return "warn";
  return "good";
}

function laneBudgetSec(lane: ColumnKey): number {
  return (LANE_SLA[lane]?.budgetSec ?? 0) || 0;
}

function badgeVariantForSla(level: SlaLevel) {
  return level === "good" ? "success" : level === "warn" ? "warning" : "danger";
}

function orderAgeSec(o: DispatchOrder) {
  return secondsSince(o.lastDispatchAttemptAt || o.createdAt);
}

function isStuck(o: DispatchOrder) {
  if (o.dispatchStatus === "searching" || o.dispatchStatus === "needs_driver") {
    return orderAgeSec(o) >= OPS_OVERRIDE_BUFFER_SEC;
  }
  return false;
}

function laneForOrder(o: DispatchOrder, offer?: OfferLite | null): ColumnKey {
  if (o.driverId) return "assigned";
  if (offer?.status === "pending") return "offered";
  if (offer?.status === "expired" || offer?.status === "rejected")
    return "needs_driver";
  if (offer?.status === "accepted") return "assigned";
  return o.dispatchStatus;
}

function orderSubtitle(o: DispatchOrder) {
  const flow = o.flowType || "transport";
  const stat = o.status || "pending";
  return `${flow} • ${stat}`;
}

function parseDropId(id: string) {
  if (!id) return null;
  const [kind, raw] = id.split(":");
  if (kind !== "order") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseDragId(id: string) {
  if (!id) return null;
  const [kind, raw] = id.split(":");
  if (kind !== "driver") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function CommandCenterPage({ mode = "ops" }: { mode?: "ops" | "partner" } = {}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const { token, viewer } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const panelParam = searchParams.get("panel");

  // Force a re-render tick so countdown badges (offer/buffer/SLA) feel realtime.
  const [nowTick, setNowTick] = React.useState<number>(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useDispatchRealtime();

  const isPartner = mode === "partner";

  const ordersQ = isPartner ? usePartnerOrders() : useOpsOrders();
  const driversQ = isPartner ? usePartnerDrivers() : useOpsDrivers();
  const offerM = useAssignDriver({ mode });
  const redispatchM = useRedispatchOrder({ mode });
  const partnerOverviewQ = usePartnerOverview({ enabled: isPartner });

  const [search, setSearch] = React.useState("");
  const [onlyStuck, setOnlyStuck] = React.useState(true);

  // UI prefs (persisted)
  const [rightHidden, setRightHidden] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem("ops.command.rightHidden") === "1";
    } catch {
      return false;
    }
  });

  const [rightCollapsed, setRightCollapsed] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem("ops.command.rightCollapsed") === "1";
    } catch {
      return false;
    }
  });

  const [autoRefresh, setAutoRefresh] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem("ops.command.autoRefresh") === "1";
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        "ops.command.rightCollapsed",
        rightCollapsed ? "1" : "0"
      );
    } catch {}
  }, [rightCollapsed]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        "ops.command.rightHidden",
        rightHidden ? "1" : "0"
      );
    } catch {}
  }, [rightHidden]);

  React.useEffect(() => {
    if (panelParam !== "drivers") return;
    if (typeof window === "undefined" || typeof document === "undefined") return;
    setRightHidden(false);
    setRightCollapsed(false);
    const timer = window.setTimeout(() => {
      document.getElementById("ops-driver-roster-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [panelParam]);

  const [fullScreen, setFullScreen] = React.useState<boolean>(() => {
    try {
      const v = window.localStorage.getItem("ops.command.fullScreen");
      return v ? v === "1" : true;
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem("ops.command.fullScreen", fullScreen ? "1" : "0");
      window.dispatchEvent(new Event("ops.command.fullScreen"));
    } catch {}
  }, [fullScreen]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem("ops.command.autoRefresh", autoRefresh ? "1" : "0");
    } catch {}
  }, [autoRefresh]);

  const [focusOrderId, setFocusOrderId] = React.useState<number | null>(null);

  const [chatState, setChatState] = React.useState<null | {
    orderId?: number | null;
    contextOrderId?: number | null;
    driverId: number;
    driverName: string;
  }>(null);

  const [showDriverDetails, setShowDriverDetails] = React.useState(false);
  const [isReassigning, setIsReassigning] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);

  // Ops: auto-redispatch when lock hits 0 (prevents spam clicking)
  const [autoRedispatch, setAutoRedispatch] = React.useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("ops:autoRedispatch");
      return raw === "1";
    } catch {
      return false;
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem("ops:autoRedispatch", autoRedispatch ? "1" : "0");
    } catch {}
  }, [autoRedispatch]);

  // Local offer tracking (manual drag → offer) so we can show a precise timer even without polling.
  const [offers, setOffers] = React.useState<Record<number, OfferLite>>({});

  const upsertOffer = React.useCallback((orderId: number, next: Partial<OfferLite>) => {
    setOffers((prev) => {
      const cur = prev[orderId];
      const offeredAt = next.offeredAt ?? cur?.offeredAt ?? new Date().toISOString();
      const expiresAt =
        next.expiresAt ??
        cur?.expiresAt ??
        computeExpiresAt(offeredAt) ??
        new Date(Date.now() + 70_000).toISOString();

      const driverId = Number(next.driverId ?? cur?.driverId ?? 0) || 0;
      const status = (next.status ?? cur?.status ?? "pending") as OfferLite["status"];

      return { ...prev, [orderId]: { orderId, driverId, status, offeredAt, expiresAt } };
    });
  }, []);

  const clearOffer = React.useCallback((orderId: number) => {
    setOffers((prev) => {
      const n = { ...prev };
      delete n[orderId];
      return n;
    });
  }, []);

  // Auto-expire local pending offers on the UI (even if realtime is delayed)
  React.useEffect(() => {
    const t = setInterval(() => {
      setOffers((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [k, o] of Object.entries(prev)) {
          if (o.status === "pending" && msRemaining(o.expiresAt) <= 0) {
            next[Number(k)] = { ...o, status: "expired" };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 250);
    return () => clearInterval(t);
  }, []);

  // Listen to realtime events (if your backend emits to ops users) to mark offers accepted/expired.
  React.useEffect(() => {
    const s = getSocket();
    const handle = (payload: any) => {
      const evt = payload?.event ?? payload;
      const t = normalizeRealtimeEventType(evt?.type ?? payload?.type);
      if (!t) return;

      const orderId = Number(getRealtimeEventOrderId(evt) || 0) || 0;
      if (!orderId) return;

      if (t === RealtimeEventTypes.DRIVER_ASSIGNED) {
        upsertOffer(orderId, { status: "accepted" });
        setTimeout(() => clearOffer(orderId), 1500);
      } else if (t === RealtimeEventTypes.DRIVER_OFFER_EXPIRED) {
        upsertOffer(orderId, { status: "expired" });
      } else if (t === RealtimeEventTypes.DRIVER_REJECTED) {
        upsertOffer(orderId, { status: "rejected" });
      }
    };

    s.on("event", handle);
    s.on("realtime:event", handle);
    const onAny = (_name: string, p: any) => handle(p);
    s.onAny(onAny);

    return () => {
      s.off("event", handle);
      s.off("realtime:event", handle);
      s.offAny(onAny);
    };
  }, [upsertOffer, clearOffer]);

  const orders = ordersQ.data ?? [];
  const drivers = driversQ.data ?? [];

  // Safety net: if the server data shows the order got a driver, clear local offer UI.
  React.useEffect(() => {
    if (!orders.length) return;
    for (const o of orders) {
      if (o?.id && o.driverId) {
        const local = offers[o.id];
        if (local && local.status === "pending") {
          upsertOffer(o.id, { status: "accepted" });
          setTimeout(() => clearOffer(o.id), 1200);
        } else {
          clearOffer(o.id);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      driversQ.refetch();
    }, 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const focusOrder = React.useMemo(() => {
    if (!orders.length) return null;
    const chosen =
      (focusOrderId ? orders.find((o) => o.id === focusOrderId) : null) ??
      orders.find((o) => isStuck(o)) ??
      orders.find((o) => !o.driverId) ??
      orders[0];
    return chosen ?? null;
  }, [orders, focusOrderId]);

  const focusLane: ColumnKey | null = React.useMemo(() => {
    if (!focusOrder) return null;
    return laneForOrder(focusOrder, offers[focusOrder.id]) as ColumnKey;
  }, [focusOrder, offers, nowTick]);

  const assignedDriver: OpsDriver | null = React.useMemo(() => {
    if (!focusOrder?.driverId) return null;
    const id = Number(focusOrder.driverId);
    const d = drivers.find((x) => Number(x.id) === id);
    return d ?? null;
  }, [focusOrder?.driverId, drivers]);

  const filteredOrders = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders;

    if (q) {
      list = list.filter((o) => {
        return (
          String(o.id).includes(q) ||
          o.referenceNo.toLowerCase().includes(q) ||
          o.pickupAddress.toLowerCase().includes(q) ||
          o.dropoffAddress.toLowerCase().includes(q)
        );
      });
    }

    if (onlyStuck)
      list = list.filter(
        (o) => isStuck(o) || laneForOrder(o, offers[o.id]) === "needs_driver"
      );

    list = [...list].sort((a, b) => Number(isStuck(b)) - Number(isStuck(a)));
    return list;
  }, [orders, search, onlyStuck, offers, nowTick]);

  const byLane = React.useMemo(() => {
    const map: Record<string, DispatchOrder[]> = {};
    for (const c of COLUMNS) map[c.key] = [];
    for (const o of filteredOrders) {
      const lane = laneForOrder(o, offers[o.id]);
      map[lane]?.push(o);
    }
    return map as Record<ColumnKey, DispatchOrder[]>;
  }, [filteredOrders, offers]);

  const laneStats = React.useMemo(() => {
    const out: Record<ColumnKey, { maxAgeSec: number; avgAgeSec: number }> = {
      needs_driver: { maxAgeSec: 0, avgAgeSec: 0 },
      searching: { maxAgeSec: 0, avgAgeSec: 0 },
      offered: { maxAgeSec: 0, avgAgeSec: 0 },
      assigned: { maxAgeSec: 0, avgAgeSec: 0 },
      problem: { maxAgeSec: 0, avgAgeSec: 0 },
    };

    for (const key of Object.keys(out) as ColumnKey[]) {
      const list = byLane[key] ?? [];
      if (!list.length) continue;
      const ages = list.map((o) => orderAgeSec(o));
      out[key].maxAgeSec = Math.max(...ages);
      out[key].avgAgeSec = Math.round(
        ages.reduce((a, b) => a + b, 0) / Math.max(1, ages.length)
      );
    }

    return out;
  }, [byLane, nowTick]);

  const driverRecs = React.useMemo(() => {
    if (!focusOrder) return [];
    const pickup = { lat: focusOrder.pickupLat, lng: focusOrder.pickupLng };

    const scored = drivers.map((d) => {
      const online = isOnline(d.lastSeenAt, 90) && (d.status ?? "") !== "offline";
      const distKm = haversineKm(pickup.lat, pickup.lng, d.lat, d.lng);
      const trust = typeof d.score === "number" ? d.score : 0;
      const penalty =
        (d.timeoutStrikes ?? 0) * 3 + (d.missStreak ?? 0) * 2 + (d.idleFlags ?? 0) * 1;
      const score = (online ? 1000 : 0) + Math.max(0, 200 - distKm * 20) + trust - penalty;
      return { d, online, distKm, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 18);
  }, [drivers, focusOrder]);

  function onDragEnd(ev: DragEndEvent) {
    const overId = String(ev.over?.id ?? "");
    const activeId = String(ev.active?.id ?? "");

    const orderId = parseDropId(overId);
    const driverId = parseDragId(activeId);
    if (!orderId || !driverId) return;

    const offeredAt = new Date().toISOString();
    const expiresAt =
      computeExpiresAt(offeredAt) ?? new Date(Date.now() + 70_000).toISOString();

    upsertOffer(orderId, { orderId, driverId, status: "pending", offeredAt, expiresAt });

    offerM.mutate(
      { orderId, driverId, note: "Manual ops offer" },
      {
        onSuccess: (res: any) => {
          const attempt =
            res?.attempt ?? res?.dispatch_attempt ?? res?.data?.attempt ?? null;
          if (attempt) {
            const oa = String(attempt.offered_at ?? offeredAt);
            const ea =
              String(attempt.expires_at ?? "") || computeExpiresAt(oa) || expiresAt;
            upsertOffer(orderId, {
              driverId,
              status: "pending",
              offeredAt: oa,
              expiresAt: ea,
            });
            return;
          }

          const assignedDriverId =
            Number(
              res?.order?.driver_id ??
                res?.order?.driverId ??
                res?.driver_id ??
                0
            ) || 0;

          if (assignedDriverId) {
            upsertOffer(orderId, {
              driverId: assignedDriverId,
              status: "accepted",
              offeredAt,
              expiresAt: offeredAt,
            });
            setTimeout(() => clearOffer(orderId), 1500);
          }
        },
        onError: () => {
          upsertOffer(orderId, { status: "expired" });
        },
      }
    );
  }

  const loading = ordersQ.isLoading || driversQ.isLoading;

  const onlineDrivers = React.useMemo(
    () =>
      drivers.filter(
        (d) => isOnline(d.lastSeenAt, 90) && (d.status ?? "") !== "offline"
      ),
    [drivers]
  );
  const availableDrivers = React.useMemo(
    () => onlineDrivers.filter((d) => (d.status ?? "") === "available"),
    [onlineDrivers]
  );

  const offerStats = React.useMemo(() => {
    const list = Object.values(offers);
    const pending = list.filter((o) => o.status === "pending");
    const accepted = list.filter((o) => o.status === "accepted");
    const expired = list.filter((o) => o.status === "expired");
    const rejected = list.filter((o) => o.status === "rejected");
    const resolved = accepted.length + expired.length + rejected.length;
    const acceptRate =
      resolved > 0 ? Math.round((accepted.length / resolved) * 100) : null;

    const pendingRemainingAvg =
      pending.length > 0
        ? Math.round(
            pending
              .map((o) => Math.max(0, Math.ceil(msRemaining(o.expiresAt) / 1000)))
              .reduce((a, b) => a + b, 0) / pending.length
          )
        : 0;

    return {
      pending: pending.length,
      accepted: accepted.length,
      expired: expired.length,
      rejected: rejected.length,
      acceptRate,
      pendingRemainingAvg,
    };
  }, [offers]);

  const driverPerf = React.useMemo(() => {
    const list = onlineDrivers;
    const avgResponse = avgFrom(
      list
        .map((d) => d.avgResponseMs)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    );
    const avgAck = avgFrom(
      list
        .map((d) => d.avgAckMs)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    );
    const timeouts = sumFrom(list.map((d) => d.timeoutStrikes ?? 0));
    const misses = sumFrom(list.map((d) => d.missStreak ?? 0));
    const idle = sumFrom(list.map((d) => d.idleFlags ?? 0));
    return { avgResponse, avgAck, timeouts, misses, idle };
  }, [onlineDrivers]);

  const assignedSla = React.useMemo(() => {
    const assigned = orders.filter((o) => !!o.driverId && !!o.assignedAt).slice(0, 60);
    const secs = assigned
      .map((o) => {
        const c = new Date(o.createdAt).getTime();
        const a = new Date(o.assignedAt as any).getTime();
        return Number.isFinite(c) && Number.isFinite(a)
          ? Math.max(0, Math.round((a - c) / 1000))
          : 0;
      })
      .filter((s) => s > 0);

    return {
      avgAssignSec: secs.length
        ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length)
        : null,
    };
  }, [orders]);

  const focusTimers = React.useMemo(() => {
    if (!focusOrder)
      return {
        canRedispatch: false,
        label: "No order selected",
        reason: "no_order",
        remainingSec: 0,
      };

    const offer = offers[focusOrder.id];

    if (offer?.status === "pending") {
      const offerRemainingSec = Math.max(
        0,
        Math.ceil(msRemaining(offer.expiresAt) / 1000)
      );
      return {
        canRedispatch: false,
        label: `Offer running • wait ${offerRemainingSec}s`,
        reason: "offer_pending",
        remainingSec: offerRemainingSec,
      };
    }

    if (
      (focusOrder.dispatchStatus === "searching" ||
        focusOrder.dispatchStatus === "needs_driver") &&
      orderAgeSec(focusOrder) < OPS_OVERRIDE_BUFFER_SEC
    ) {
      const left = Math.max(0, OPS_OVERRIDE_BUFFER_SEC - orderAgeSec(focusOrder));
      return {
        canRedispatch: false,
        label: `Auto-dispatch buffer • wait ${left}s`,
        reason: "buffer",
        remainingSec: left,
      };
    }

    return { canRedispatch: true, label: "Redispatch now", reason: "ready", remainingSec: 0 };
  }, [focusOrder, offers, nowTick]);

  // Auto-redispatch: when a lock transitions -> ready, fire once.
  const prevLockRef = React.useRef<{
    orderId: number | null;
    can: boolean;
    reason: string | null;
  }>({ orderId: null, can: true, reason: null });

  const lastAutoFireRef = React.useRef<Record<number, number>>({});
  React.useEffect(() => {
    const orderId = focusOrder?.id ?? null;
    const prev = prevLockRef.current;

    if (prev.orderId !== orderId) {
      prevLockRef.current = {
        orderId,
        can: focusTimers.canRedispatch,
        reason: focusTimers.reason,
      } as any;
      return;
    }

    const transitioned = prev.can === false && focusTimers.canRedispatch === true;
    const wasLockReason = prev.reason === "offer_pending" || prev.reason === "buffer";

    if (autoRedispatch && orderId && transitioned && wasLockReason && !redispatchM.isPending) {
      const last = lastAutoFireRef.current[orderId] ?? 0;
      if (Date.now() - last > 15_000) {
        lastAutoFireRef.current[orderId] = Date.now();
        redispatchM.mutate(
          { orderId },
          {
            onSuccess: () => {
              clearOffer(orderId);
              ordersQ.refetch();
            },
          }
        );
      }
    }

    prevLockRef.current = {
      orderId,
      can: focusTimers.canRedispatch,
      reason: focusTimers.reason,
    } as any;
  }, [
    autoRedispatch,
    focusOrder?.id,
    focusTimers.canRedispatch,
    focusTimers.reason,
    redispatchM.isPending,
    clearOffer,
    ordersQ,
    redispatchM,
  ]);

  const cancelFocused = React.useCallback(async () => {
    if (!focusOrder) return;
    if (isPartner) {
      alert("Partners can't cancel orders from the console. Please contact system ops if you need a cancel.");
      return;
    }
    if (!token) {
      alert("Not authenticated");
      return;
    }
    const note = window.prompt("Cancel reason (optional)", "") ?? "";
    setIsCancelling(true);
    try {
      await opsCancelOrder(token, { orderId: focusOrder.id, note: note.trim() || undefined });
      clearOffer(focusOrder.id);
      await ordersQ.refetch();
      await driversQ.refetch();
    } catch (e: any) {
      alert(e?.message ?? "Cancel failed");
    } finally {
      setIsCancelling(false);
    }
  }, [focusOrder, token, ordersQ, driversQ, clearOffer, isPartner]);

  const reassignFocused = React.useCallback(async () => {
    if (!focusOrder) return;
    if (!token) {
      alert("Not authenticated");
      return;
    }
    if (!focusTimers.canRedispatch) {
      alert(`Locked: ${focusTimers.label}`);
      return;
    }
    const ok = window.confirm(
      `Reassign this order? This will unassign the current driver and restart dispatch.\n\nOrder: ${focusOrder.referenceNo}`
    );
    if (!ok) return;
    const note = window.prompt("Reassign note (optional)", "") ?? "";
    setIsReassigning(true);
    try {
      if (isPartner) {
        // Partners use their scoped redispatch (unassign + restart dispatch) endpoint.
        await new Promise<void>((resolve, reject) => {
          redispatchM.mutate(
            { orderId: focusOrder.id, note: note.trim() || undefined },
            {
              onSuccess: () => resolve(),
              onError: (err: any) => reject(err),
            }
          );
        });
      } else {
        await opsReassignOrder(token, { orderId: focusOrder.id, note: note.trim() || undefined });
      }
      clearOffer(focusOrder.id);
      await ordersQ.refetch();
      await driversQ.refetch();
    } catch (e: any) {
      alert(e?.message ?? "Reassign failed");
    } finally {
      setIsReassigning(false);
    }
  }, [focusOrder, token, focusTimers.canRedispatch, focusTimers.label, ordersQ, driversQ, clearOffer, isPartner, redispatchM]);

  // Dock helpers
  const suggestedDrivers = driverRecs;
  const searching = byLane.searching ?? [];
  const needsDriver = byLane.needs_driver ?? [];

  return (
    <div className="flex h-[calc(100vh-0px)] w-full flex-col p-4 lg:p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-lg font-semibold">{isPartner ? "Partner Dispatch Center" : "OPS Command Center"}</div>
          <div className="text-sm text-muted-foreground">
            {isPartner
              ? "Manage your fleet: drag one of your drivers onto an order to dispatch."
              : "Drag a driver onto an order to send a dispatch offer."}{" "}
            Yellow = pending timer, green = accepted, red = timeout/reject.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => {
              if (rightHidden) {
                setRightHidden(false);
                setRightCollapsed(true);
                return;
              }
              setRightCollapsed((v) => !v);
            }}
            title={
              rightHidden
                ? "Show side dock"
                : rightCollapsed
                ? "Expand side panel"
                : "Collapse to dock"
            }
          >
            {rightHidden ? (
              <PanelRightOpen className="size-4" />
            ) : rightCollapsed ? (
              <PanelRightOpen className="size-4" />
            ) : (
              <PanelRightClose className="size-4" />
            )}
          </Button>

          {!rightHidden ? (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setRightHidden(true)}
              title="Hide right panel"
            >
              <X className="size-4" />
            </Button>
          ) : null}

          <Button
            variant="secondary"
            size="icon"
            onClick={() => setFullScreen((v) => !v)}
            title={fullScreen ? "Exit full screen" : "Full screen"}
          >
            {fullScreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders…"
              className="w-[260px] pl-8"
            />
          </div>

          <Button
            variant={onlyStuck ? "default" : "secondary"}
            onClick={() => setOnlyStuck((v) => !v)}
          >
            <Zap className="mr-2 size-4" />
            {onlyStuck ? "Showing stuck" : "Showing all"}
          </Button>

          <Button
            variant={autoRefresh ? "default" : "secondary"}
            onClick={() => setAutoRefresh((v) => !v)}
            title="Toggle polling (realtime still works)"
          >
            <RefreshCw className={cn("mr-2 size-4", autoRefresh && "animate-spin")} />
            {autoRefresh ? "Auto refresh: On" : "Auto refresh: Off"}
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              ordersQ.refetch();
              driversQ.refetch();
            }}
          >
            <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
            Refresh
          </Button>

          <Button variant="secondary" onClick={() => nav("/ops/logout")}>
            Logout
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid flex-1 min-h-0 grid-cols-1 gap-4",
          rightHidden
            ? "lg:grid-cols-[1fr]"
            : rightCollapsed
            ? "lg:grid-cols-[1fr_56px]"
            : "lg:grid-cols-[1fr_360px]"
        )}
      >
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <>
            {/* Orders lanes */}
            <div className="h-full min-h-0 overflow-x-auto">
              <div className="flex gap-3 pb-2">
                {COLUMNS.map((c) => (
                  <Lane
                    key={c.key}
                    lane={c.key}
                    title={c.title}
                    hint={c.hint}
                    count={byLane[c.key]?.length ?? 0}
                    maxAgeSec={laneStats[c.key]?.maxAgeSec ?? 0}
                    avgAgeSec={laneStats[c.key]?.avgAgeSec ?? 0}
                  >
                    <div className="flex flex-col gap-2">
                      {(byLane[c.key] ?? []).map((o) => (
                        <OrderCard
                          key={o.id}
                          order={o}
                          offer={offers[o.id]}
                          focused={focusOrder?.id === o.id}
                          onFocus={() => setFocusOrderId(o.id)}
                        />
                      ))}
                      {(byLane[c.key] ?? []).length === 0 ? <EmptyLane /> : null}
                    </div>
                  </Lane>
                ))}
              </div>
            </div>

            {/* Right panel (FIXED: no incomplete ternary) */}
            {!rightHidden ? (
              rightCollapsed ? (
                <div className="h-full min-h-0 overflow-hidden rounded-xl border border-border bg-muted/10 p-2">
                  <div className="flex h-full flex-col items-center gap-2">
                    <div className="flex w-full items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Expand"
                        onClick={() => setRightCollapsed(false)}
                      >
                        <PanelRightOpen className="h-5 w-5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        title="Hide"
                        onClick={() => setRightHidden(true)}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="mt-1 flex flex-1 flex-col items-center gap-2">
                      <button
                        type="button"
                        title="Best drivers"
                        onClick={() => setRightCollapsed(false)}
                        className="relative grid h-10 w-10 place-items-center rounded-lg border border-border bg-background hover:bg-accent"
                      >
                        <Zap className="h-4 w-4" />
                        <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                          {Math.min(99, suggestedDrivers?.length ?? 0)}
                        </span>
                      </button>

                      <button
                        type="button"
                        title="Searching"
                        onClick={() => setRightCollapsed(false)}
                        className="relative grid h-10 w-10 place-items-center rounded-lg border border-border bg-background hover:bg-accent"
                      >
                        <Search className="h-4 w-4" />
                        <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                          {Math.min(99, searching.length)}
                        </span>
                      </button>

                      <button
                        type="button"
                        title="Needs driver"
                        onClick={() => setRightCollapsed(false)}
                        className="relative grid h-10 w-10 place-items-center rounded-lg border border-border bg-background hover:bg-accent"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                          {Math.min(99, needsDriver.length)}
                        </span>
                      </button>
                    </div>

                    <div className="pb-1 text-[10px] text-muted-foreground">Dock</div>
                  </div>
                </div>
              ) : (
                <div
                  id="ops-driver-roster-panel"
                  tabIndex={-1}
                  className="h-full min-h-0 overflow-y-auto space-y-3 pr-1"
                >
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Best drivers (suggested)</div>
                        <Badge variant="secondary">{driverRecs.length}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {focusOrder
                          ? `For ${focusOrder.referenceNo} — pickup: ${focusOrder.pickupAddress}`
                          : "Select an order to see suggestions"}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      {!focusOrder ? (
                        <EmptyState
                          title="No active order"
                          subtitle="When there are orders needing drivers, pick one to see recommendations."
                        />
                      ) : (
                        <div className="flex flex-col gap-2">
                          {driverRecs.map(({ d, online, distKm }) => (
                            <DriverCard
                              key={d.id}
                              driver={d}
                              online={online}
                              distKm={distKm}
                              pendingOffer={findPendingOfferForDriver(offers, d.id)}
                              onChat={() => {
                                setChatState({
                                  driverId: d.id,
                                  driverName: d.name,
                                  orderId: null,
                                  contextOrderId: focusOrder?.id ?? null,
                                });
                              }}
                              onCall={() => {
                                if (!d.mobile) return;
                                try {
                                  window.open(`tel:${d.mobile}`);
                                } catch {}
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Dispatch War Room</div>
                        <div className="flex items-center gap-2">
                          <Badge variant={offerStats.pending > 0 ? "warning" : "secondary"}>
                            {offerStats.pending} pending
                          </Badge>
                          <Badge
                            variant={byLane.needs_driver.length > 0 ? "warning" : "secondary"}
                          >
                            {byLane.needs_driver.length} needs
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        SLA timers per lane • supply & quality • ops override locks while timers are running
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <Metric label="Online drivers" value={onlineDrivers.length} />
                        <Metric label="Available" value={availableDrivers.length} />
                        {isPartner ? (
                          <>
                            <Metric
                              label="Completed today"
                              value={partnerOverviewQ.data?.completed_today ?? 0}
                            />
                            <Metric
                              label="Earnings today"
                              value={`${partnerOverviewQ.data?.earnings_today_points ?? 0} pts`}
                            />
                            <Metric
                              label="Wallet balance"
                              value={`${partnerOverviewQ.data?.wallet_balance_points ?? 0} pts`}
                            />
                          </>
                        ) : null}
                        <Metric
                          label="Offer accept %"
                          value={offerStats.acceptRate === null ? "—" : `${offerStats.acceptRate}%`}
                        />
                        <Metric
                          label="Avg response"
                          value={driverPerf.avgResponse === null ? "—" : `${driverPerf.avgResponse}ms`}
                        />
                        <Metric
                          label="Avg assign"
                          value={assignedSla.avgAssignSec === null ? "—" : fmtSeconds(assignedSla.avgAssignSec)}
                        />
                        <Metric label="Timeout strikes" value={driverPerf.timeouts} />
                      </div>

                      <Separator />

                      {!focusOrder ? (
                        <EmptyState
                          title="Select an order"
                          subtitle="Pick a lane card to unlock actions + best-driver suggestions."
                        />
                      ) : (
                        <div className="rounded-xl border border-border bg-muted/20 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">
                                {focusOrder.referenceNo}
                              </div>
                              <div className="mt-1 truncate text-xs text-muted-foreground">
                                {focusOrder.pickupAddress} → {focusOrder.dropoffAddress}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <Badge
                                variant={
                                  badgeVariantForSla(
                                    slaLevelFromSec(
                                      orderAgeSec(focusOrder),
                                      laneForOrder(focusOrder, offers[focusOrder.id])
                                    )
                                  ) as any
                                }
                                className="text-[11px]"
                              >
                                <Clock className="mr-1 size-3" />
                                {fmtSeconds(orderAgeSec(focusOrder))}
                              </Badge>

                              <Badge
                                variant={focusTimers.canRedispatch ? "success" : "warning"}
                                className="text-[11px]"
                              >
                                {focusTimers.canRedispatch ? "Override ready" : "Override locked"}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg border border-border bg-background/40 px-2 py-2 text-muted-foreground">
                              Lane<br />
                              <span className="font-medium text-foreground">
                                {laneForOrder(focusOrder, offers[focusOrder.id])}
                              </span>
                            </div>
                            <div className="rounded-lg border border-border bg-background/40 px-2 py-2 text-muted-foreground">
                              Offer status<br />
                              <span className="font-medium text-foreground">
                                {offers[focusOrder.id]?.status ?? "none"}
                              </span>
                            </div>
                            <div className="rounded-lg border border-border bg-background/40 px-2 py-2 text-muted-foreground">
                              Buffer / lock<br />
                              <span className="font-medium text-foreground">
                                {focusTimers.canRedispatch ? "0s" : `${focusTimers.remainingSec}s`}
                              </span>
                            </div>
                            <div className="rounded-lg border border-border bg-background/40 px-2 py-2 text-muted-foreground">
                              SLA max (lane)<br />
                              <span className="font-medium text-foreground">
                                {fmtSeconds(
                                  laneStats[laneForOrder(focusOrder, offers[focusOrder.id])]?.maxAgeSec ?? 0
                                )}
                              </span>
                            </div>
                          </div>

                          {focusLane === "assigned" && assignedDriver ? (
                            <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-xs text-muted-foreground">Assigned driver</div>
                                  <div className="truncate text-sm font-semibold">{assignedDriver.name}</div>
                                </div>
                                <Badge
                                  variant={
                                    isOnline(assignedDriver.lastSeenAt, 90) &&
                                    (assignedDriver.status ?? "") !== "offline"
                                      ? "success"
                                      : "secondary"
                                  }
                                  className="text-[11px]"
                                >
                                  {isOnline(assignedDriver.lastSeenAt, 90) &&
                                  (assignedDriver.status ?? "") !== "offline"
                                    ? "Online"
                                    : "Offline"}
                                </Badge>
                              </div>

                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-lg border border-border bg-background/40 px-2 py-2 text-muted-foreground">
                                  Phone<br />
                                  <span className="font-medium text-foreground">{assignedDriver.mobile ?? "—"}</span>
                                </div>
                                <div className="rounded-lg border border-border bg-background/40 px-2 py-2 text-muted-foreground">
                                  Distance (to pickup)<br />
                                  <span className="font-medium text-foreground">
                                    {Number.isFinite((assignedDriver as any).latitude) &&
                                    Number.isFinite((assignedDriver as any).longitude) &&
                                    Number.isFinite(focusOrder.pickupLat) &&
                                    Number.isFinite(focusOrder.pickupLng)
                                      ? `${haversineKm(
                                          focusOrder.pickupLat,
                                          focusOrder.pickupLng,
                                          (assignedDriver as any).latitude,
                                          (assignedDriver as any).longitude
                                        ).toFixed(2)} km`
                                      : "—"}
                                  </span>
                                </div>
                                <div className="rounded-lg border border-border bg-background/40 px-2 py-2 text-muted-foreground">
                                  Trust score<br />
                                  <span className="font-medium text-foreground">{(assignedDriver as any).score ?? "—"}</span>
                                </div>
                                <div className="rounded-lg border border-border bg-background/40 px-2 py-2 text-muted-foreground">
                                  Jobs today<br />
                                  <span className="font-medium text-foreground">{(assignedDriver as any).acceptedToday ?? 0}</span>
                                </div>
                              </div>

                              {showDriverDetails ? (
                                <div className="mt-2 rounded-lg border border-border bg-muted/20 p-2 text-xs text-muted-foreground">
                                  <div className="flex items-center justify-between">
                                    <div>Last seen</div>
                                    <div className="font-medium text-foreground">
                                      {assignedDriver.lastSeenAt
                                        ? new Date(assignedDriver.lastSeenAt).toLocaleString()
                                        : "—"}
                                    </div>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between">
                                    <div>Completed today</div>
                                    <div className="font-medium text-foreground">{(assignedDriver as any).completedToday ?? 0}</div>
                                  </div>
                                </div>
                              ) : null}

                              <div className="mt-3 flex gap-2">
                                <Button
                                  variant="secondary"
                                  className="flex-1"
                                  onClick={() => setShowDriverDetails((v) => !v)}
                                >
                                  {showDriverDetails ? "Hide driver" : "View driver"}
                                </Button>
                                <Button
                                  className="flex-1"
                                  onClick={() => {
                                    setChatState({
                                      orderId: null,
                                      contextOrderId: focusOrder.id,
                                      driverId: (assignedDriver as any).id,
                                      driverName: assignedDriver.name,
                                    });
                                  }}
                                >
                                  Message driver
                                </Button>
                              </div>

                              <div className="mt-2 flex gap-2">
                                {!isPartner ? (
                                  <Button
                                    variant="destructive"
                                    className="flex-1"
                                    disabled={isCancelling}
                                    onClick={cancelFocused}
                                    title="Cancel this order (only if needed)"
                                  >
                                    {isCancelling ? "Cancelling…" : "Cancel"}
                                  </Button>
                                ) : null}
                                <Button
                                  variant={focusTimers.canRedispatch ? "default" : "secondary"}
                                  className="flex-1"
                                  disabled={!focusTimers.canRedispatch || isReassigning}
                                  onClick={reassignFocused}
                                  title={
                                    focusTimers.canRedispatch
                                      ? "Unassign current driver and restart dispatch"
                                      : focusTimers.label
                                  }
                                >
                                  {isReassigning
                                    ? "Reassigning…"
                                    : focusTimers.canRedispatch
                                    ? "Reassign"
                                    : `Locked • ${focusTimers.remainingSec}s`}
                                </Button>
                              </div>

                              {!focusTimers.canRedispatch ? (
                                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-2 py-2 text-xs text-muted-foreground">
                                  <div className="min-w-0 truncate">{focusTimers.label}</div>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <>
                              <div className="mt-3 flex items-center gap-2">
                                <Button
                                  className="flex-1"
                                  disabled={!focusTimers.canRedispatch || redispatchM.isPending}
                                  onClick={() => {
                                    if (!focusOrder) return;
                                    redispatchM.mutate(
                                      { orderId: focusOrder.id },
                                      {
                                        onSuccess: () => {
                                          clearOffer(focusOrder.id);
                                          ordersQ.refetch();
                                        },
                                      }
                                    );
                                  }}
                                >
                                  <RefreshCw
                                    className={cn(
                                      "mr-2 size-4",
                                      redispatchM.isPending && "animate-spin"
                                    )}
                                  />
                                  {focusTimers.canRedispatch
                                    ? "Finalize redispatch"
                                    : `Locked • ${focusTimers.remainingSec}s`}
                                </Button>

                                <Button
                                  variant={autoRedispatch ? "default" : "secondary"}
                                  onClick={() => setAutoRedispatch((v) => !v)}
                                  title="Auto-redispatch when unlock timer reaches 0"
                                >
                                  {autoRedispatch ? "Auto: ON" : "Auto: OFF"}
                                </Button>

                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    ordersQ.refetch();
                                    driversQ.refetch();
                                  }}
                                >
                                  Refresh
                                </Button>
                              </div>

                              {!focusTimers.canRedispatch ? (
                                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-2 py-2 text-xs text-muted-foreground">
                                  <div className="min-w-0 truncate">{focusTimers.label}</div>
                                  {autoRedispatch ? (
                                    <Badge variant="secondary" className="shrink-0 text-[11px]">
                                      Auto armed
                                    </Badge>
                                  ) : null}
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Best practice: let auto-dispatch run first. If still unassigned after{" "}
                        {OPS_OVERRIDE_BUFFER_SEC}s, drag the nearest online driver with low timeout/miss streak.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            ) : null}
          </>
        </DndContext>
      </div>

      {/* When the right panel is fully hidden, show a floating "handle" like the left nav */}
      {rightHidden ? (
        <Button
          variant="secondary"
          size="icon"
          className="fixed right-3 top-1/2 z-40 -translate-y-1/2 shadow"
          onClick={() => {
            setRightHidden(false);
            setRightCollapsed(true);
          }}
          title="Show side dock"
        >
          <PanelRightOpen className="size-4" />
        </Button>
      ) : null}

      {chatState && token && viewer ? (
        <ChatThreadModal
          open={true}
          onClose={() => setChatState(null)}
          token={token}
          viewerId={Number((viewer as any).id ?? 0)}
          partnerId={chatState.driverId}
          partnerName={chatState.driverName}
          orderId={chatState.orderId}
          contextOrderId={chatState.contextOrderId}
        />
      ) : null}
    </div>
  );
}

function findPendingOfferForDriver(offers: Record<number, OfferLite>, driverId: number) {
  for (const o of Object.values(offers)) {
    if (o.driverId === driverId && o.status === "pending") return o;
  }
  return null;
}

function Lane(props: {
  lane: ColumnKey;
  title: string;
  hint: string;
  count: number;
  maxAgeSec?: number;
  avgAgeSec?: number;
  children: React.ReactNode;
}) {
  const maxAge = props.maxAgeSec ?? 0;
  const avgAge = props.avgAgeSec ?? 0;
  const level = props.count > 0 ? slaLevelFromSec(maxAge, props.lane) : "good";
  const budget = laneBudgetSec(props.lane);

  return (
    <div className="w-[290px] shrink-0">
      <div className="mb-2 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{props.title}</div>
          <div className="text-xs text-muted-foreground">{props.hint}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{props.count}</Badge>
          <Badge variant="outline" title="Lane SLA budget">
            SLA {fmtSeconds(budget)}
          </Badge>

          {props.count > 0 ? (
            <Badge
              variant={badgeVariantForSla(level) as any}
              title={`Worst-case age in this lane (avg ${fmtSeconds(avgAge)})`}
            >
              MAX {fmtSeconds(maxAge)}
            </Badge>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          "rounded-xl border border-border bg-muted/20 p-2",
          props.count > 0 &&
            level === "warn" &&
            "border-[color:var(--warning)] bg-[color:color-mix(in oklab,var(--warning)_10%,transparent)]",
          props.count > 0 &&
            level === "bad" &&
            "border-[color:var(--danger)] bg-[color:color-mix(in oklab,var(--danger)_12%,transparent)]"
        )}
      >
        {props.children}
      </div>
    </div>
  );
}

function EmptyLane() {
  return (
    <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
      No items
    </div>
  );
}

function OrderCard(props: {
  order: DispatchOrder;
  offer?: OfferLite;
  focused: boolean;
  onFocus: () => void;
}) {
  const ageSec = orderAgeSec(props.order);
  const offer = props.offer;
  const lane = laneForOrder(props.order, offer);
  const laneSla: SlaLevel = slaLevelFromSec(ageSec, lane);

  const { setNodeRef } = useDroppable({ id: `order:${props.order.id}` });

  const offerRingState =
    offer?.status === "pending"
      ? "pending"
      : offer?.status === "accepted"
      ? "accepted"
      : offer?.status === "rejected"
      ? "rejected"
      : offer?.status === "expired"
      ? "expired"
      : null;

  return (
    <div ref={setNodeRef}>
      <Card
        className={cn(
          "cursor-default transition",
          props.focused && "ring-2 ring-ring/30",
          laneSla === "warn" &&
            "border-[color:var(--warning)] bg-[color:color-mix(in oklab,var(--warning)_10%,transparent)]",
          laneSla === "bad" &&
            "border-[color:var(--danger)] bg-[color:color-mix(in oklab,var(--danger)_12%,transparent)]"
        )}
        onMouseEnter={props.onFocus}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{props.order.referenceNo}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                <span className="truncate">
                  {props.order.pickupAddress} → {props.order.dropoffAddress}
                </span>
              </div>
            </div>

            <Badge
              variant={lane !== "assigned" ? (badgeVariantForSla(laneSla) as any) : "secondary"}
              className="shrink-0"
            >
              <Clock className="mr-1 size-3" />
              {fmtSeconds(ageSec)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs">
            <div className="text-muted-foreground">
              <span className="text-foreground">{orderSubtitle(props.order)}</span>
            </div>
            <div className="text-muted-foreground">
              Driver:{" "}
              <span className="text-foreground">
                {props.order.driverId ? `#${props.order.driverId}` : "—"}
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            <div className="text-muted-foreground">
              Dispatch: <span className="text-foreground">{props.order.rawDispatchStatus}</span>
            </div>

            {offerRingState ? (
              <OfferTimerRing
                expiresAt={offer?.expiresAt}
                state={offerRingState as any}
                title={offer?.status === "pending" ? `Offering to driver #${offer.driverId}` : undefined}
              />
            ) : null}
          </div>

          {props.order.dispatchStatus === "problem" ? (
            <div className="mt-2">
              <Badge variant="warning" className="text-[11px]">
                <AlertTriangle className="mr-1 size-3" />
                Issue detected
              </Badge>
            </div>
          ) : null}

          {props.order.driverId ? (
            <div className="mt-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Assigned.
            </div>
          ) : (
            <div className="mt-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              Drop a driver here to send an offer
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DriverCard(props: {
  driver: OpsDriver;
  distKm: number;
  online: boolean;
  pendingOffer: OfferLite | null;
  onChat?: () => void;
  onCall?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `driver:${props.driver.id}`,
    data: { driverId: props.driver.id },
  });

  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const shadowbanned =
    !!(props.driver as any).shadowbannedUntil &&
    new Date((props.driver as any).shadowbannedUntil).getTime() > Date.now();

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={cn("select-none", isDragging && "opacity-60")}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <button
                type="button"
                className="mt-0.5 inline-flex cursor-grab items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                title="Drag driver to offer"
                {...listeners}
                {...attributes}
              >
                <GripVertical className="size-4" />
              </button>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{props.driver.name}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="size-3" />
                  <span className="truncate">
                    #{props.driver.id} • {props.online ? "Online" : "Offline"} •{" "}
                    {props.distKm.toFixed(1)}km
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <Badge variant={props.online ? "success" : "secondary"} className="text-[11px]">
                {props.online ? "Active" : "Idle"}
              </Badge>

              {props.pendingOffer ? (
                <OfferTimerRing expiresAt={props.pendingOffer.expiresAt} state="pending" />
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs">
            <div className="text-muted-foreground">
              Status: <span className="text-foreground">{props.driver.status || "unknown"}</span>
            </div>
            <div className="text-muted-foreground">
              Seen:{" "}
              <span className="text-foreground">
                {fmtSeconds(secondsSince(props.driver.lastSeenAt))} ago
              </span>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {typeof (props.driver as any).score === "number" ? (
              <Badge variant="secondary">Trust {(props.driver as any).score}</Badge>
            ) : null}
            {(props.driver as any).timeoutStrikes ? (
              <Badge variant="warning">Timeouts {(props.driver as any).timeoutStrikes}</Badge>
            ) : null}
            {(props.driver as any).missStreak ? (
              <Badge variant="warning">Miss {(props.driver as any).missStreak}</Badge>
            ) : null}
            {shadowbanned ? <Badge variant="warning">Shadowbanned</Badge> : null}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0 truncate text-muted-foreground">
              Phone: <span className="text-foreground">{(props.driver as any).mobile || "—"}</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="icon"
                disabled={!(props.driver as any).mobile || !props.onCall}
                title={(props.driver as any).mobile ? "Call / copy phone" : "No phone number"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onCall?.();
                }}
              >
                <Phone className="size-4" />
              </Button>

              <Button
                variant="secondary"
                size="icon"
                disabled={!props.onChat}
                title="Message driver"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onChat?.();
                }}
              >
                <MessageSquare className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState(props: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-4 text-center">
      <div className="text-sm font-semibold">{props.title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{props.subtitle}</div>
    </div>
  );
}

function Metric(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{props.label}</div>
      <div className="mt-1 text-lg font-semibold">{props.value}</div>
    </div>
  );
}
