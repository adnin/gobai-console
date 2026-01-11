import type { ApiDeliveryOrder, ApiDriverProfile } from "./api/opsApi";
import type { DispatchOrder, OpsDriver, OrderDispatchStatus } from "./types";

function toNum(v: any, fallback = 0) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isoOrNow(v: any) {
  const t = new Date(String(v ?? "")).getTime();
  if (Number.isFinite(t) && t > 0) return new Date(t).toISOString();
  return new Date().toISOString();
}

function normalizeFlowType(raw: any) {
  const v = String(raw ?? "transport").toLowerCase();
  if (v === "store" || v === "transport" || v === "parcel") return v;
  return v || "transport";
}

export function deriveDispatchStatus(o: ApiDeliveryOrder): { status: OrderDispatchStatus; raw: string } {
  const raw = String(o.dispatch_status ?? "none").toLowerCase();
  const hasDriver = !!o.driver_id || !!o.driver?.id;

  if (o.issue_detected) return { status: "problem", raw };

  if (hasDriver || raw === "assigned") return { status: "assigned", raw };

  // Offer-ish statuses
  if (raw.includes("offer") || raw.includes("offered")) return { status: "offered", raw };

  // Searching-ish statuses
  if (raw.includes("search") || raw === "planned" || raw.includes("dispatch")) return { status: "searching", raw };

  // default
  return { status: "needs_driver", raw };
}

export function mapApiOrderToDispatchOrder(o: ApiDeliveryOrder): DispatchOrder {
  const { status: dispatchStatus, raw } = deriveDispatchStatus(o);

  const createdAt = isoOrNow(o.created_at ?? o.updated_at);
  const lastDispatchAttemptAt = isoOrNow(o.dispatch_at ?? o.updated_at ?? o.created_at);

  return {
    id: Number(o.id),
    referenceNo: String(o.reference_no ?? `#${o.id}`),
    flowType: normalizeFlowType(o.flow_type),
    status: String(o.status ?? "pending"),
    dispatchStatus,
    rawDispatchStatus: raw,

    pickupAddress: String(o.pickup_address ?? ""),
    dropoffAddress: String(o.dropoff_address ?? ""),

    pickupLat: toNum(o.pickup_latitude),
    pickupLng: toNum(o.pickup_longitude),

    createdAt,
    lastDispatchAttemptAt,

    dispatchAt: o.dispatch_at ? isoOrNow(o.dispatch_at) : null,
    assignedAt: o.assigned_at ? isoOrNow(o.assigned_at) : null,

    driverId: (o.driver_id ?? o.driver?.id ?? null) as any
  };
}

export function mapApiDriverProfileToOpsDriver(p: ApiDriverProfile): OpsDriver {
  const u: any = p.user ?? ({} as any);

  // Optional trust payload (if you add it on API later)
  const trust: any =
    (p as any).trust ??
    u.trust ??
    u.trust_profile ??
    u.driver_trust ??
    u.driverTrust ??
    null;

  const stats: any = (p as any).stats ?? null;

  return {
    id: Number(u.id ?? p.user_id),
    name: String(u.name ?? u.email ?? `Driver #${u.id ?? p.user_id}`),
    status: String(u.status ?? "offline"),
    lastSeenAt: isoOrNow(u.last_seen_at ?? new Date().toISOString()),
    lat: toNum(u.latitude),
    lng: toNum(u.longitude),
    vehicleType: undefined,
    profileStatus: String(p.status ?? ""),

    mobile: (u.mobile ?? u.mobile_number ?? null) as any,

    acceptedToday: stats?.accepted_today ?? null,
    completedToday: stats?.completed_today ?? null,

    // Trust metrics (all optional)
    score: trust?.score ?? u.score ?? null,
    avgResponseMs: trust?.avg_response_ms ?? u.avg_response_ms ?? null,
    avgAckMs: trust?.avg_ack_ms ?? u.avg_ack_ms ?? null,
    missStreak: trust?.miss_streak ?? u.miss_streak ?? null,
    timeoutStrikes: trust?.timeout_strikes ?? u.timeout_strikes ?? null,
    idleFlags: trust?.idle_flags ?? u.idle_flags ?? null,
    shadowbannedUntil: trust?.shadowbanned_until ?? u.shadowbanned_until ?? null,
    lastTimeoutAt: trust?.last_timeout_at ?? u.last_timeout_at ?? null,
    lastEventAt: trust?.last_event_at ?? u.last_event_at ?? null,
  };
}