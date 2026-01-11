export type OrderDispatchStatus =
  | "needs_driver"
  | "searching"
  | "offered"
  | "assigned"
  | "problem";

export type DispatchOrder = {
  id: number;
  referenceNo: string;

  flowType: string; // store|transport|parcel|...
  status: string; // pending|accepted|delivered|cancelled|...

  dispatchStatus: OrderDispatchStatus;
  rawDispatchStatus: string;

  pickupAddress: string;
  dropoffAddress: string;

  pickupLat: number;
  pickupLng: number;

  createdAt: string; // ISO
  lastDispatchAttemptAt: string; // ISO (uses dispatch_at/updated_at fallback)

  dispatchAt?: string | null; // dispatch_at (when dispatch/searching starts)
  assignedAt?: string | null; // assigned_at (when driver is locked in)

  driverId: number | null;
};

export type OpsDriver = {
  // Trust/quality metrics (optional; if your API provides it)
  score?: number | null;
  avgResponseMs?: number | null;
  avgAckMs?: number | null;
  missStreak?: number | null;
  timeoutStrikes?: number | null;
  idleFlags?: number | null;
  shadowbannedUntil?: string | null;
  lastTimeoutAt?: string | null;
  lastEventAt?: string | null;

  id: number;
  name: string;

  mobile?: string | null;

  acceptedToday?: number | null;
  completedToday?: number | null;

  status: string; // available|busy|away|offline|...
  lastSeenAt: string; // ISO

  lat: number;
  lng: number;

  // Optional extra labels (future)
  vehicleType?: string;
  profileStatus?: string; // approved|pending|...
};
