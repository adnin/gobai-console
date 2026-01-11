/**
 * Canonical realtime/socket event type constants.
 * Mirrors App\Services\RealtimeEventTypes on the API side.
 */
export const RealtimeEventTypes = {
  // A) Order lifecycle
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_UPDATED: "ORDER_UPDATED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  ORDER_EXPIRED: "ORDER_EXPIRED",
  ORDER_REDISPATCHED: "ORDER_REDISPATCHED",
  ORDER_SEARCH_CANCELLED: "ORDER_SEARCH_CANCELLED",

  // B) Dispatch & driver matching
  DISPATCH_SEARCHING: "DISPATCH_SEARCHING",
  DRIVER_OFFERED: "DRIVER_OFFERED",
  DRIVER_OFFER_EXPIRED: "DRIVER_OFFER_EXPIRED",
  DRIVER_ASSIGNED: "DRIVER_ASSIGNED",
  DRIVER_REJECTED: "DRIVER_REJECTED",
  DRIVER_UNASSIGNED: "DRIVER_UNASSIGNED",

  // C) Trip progress (driver statuses)
  DRIVER_EN_ROUTE_TO_PICKUP: "DRIVER_EN_ROUTE_TO_PICKUP",
  DRIVER_ARRIVED_PICKUP: "DRIVER_ARRIVED_PICKUP",
  PICKED_UP: "PICKED_UP",
  EN_ROUTE_TO_DROPOFF: "EN_ROUTE_TO_DROPOFF",
  ARRIVED_DROPOFF: "ARRIVED_DROPOFF",
  DELIVERED: "DELIVERED",
  DELIVERY_CONFIRMED: "DELIVERY_CONFIRMED",

  // D) Payments / Wallet / Escrow
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  PAYMENT_SUBMITTED: "PAYMENT_SUBMITTED",
  PAYMENT_VERIFIED: "PAYMENT_VERIFIED",
  PAYMENT_REJECTED: "PAYMENT_REJECTED",
  WALLET_UPDATED: "WALLET_UPDATED",
  ESCROW_UPDATED: "ESCROW_UPDATED",
  REFUND_ISSUED: "REFUND_ISSUED",

  // E) Store / Merchant workflow
  STORE_ACCEPTED: "STORE_ACCEPTED",
  STORE_PREP_STATUS_UPDATED: "STORE_PREP_STATUS_UPDATED",
  STORE_READY: "STORE_READY",
  STORE_CANCELLED: "STORE_CANCELLED",
  ITEMS_UPDATED: "ITEMS_UPDATED",

  // F) COD / OTP / Parcel COD
  COD_OTP_SENT: "COD_OTP_SENT",
  COD_OTP_CONFIRMED: "COD_OTP_CONFIRMED",
  COD_OTP_EXPIRED: "COD_OTP_EXPIRED",
  PARCEL_COD_COLLECTED: "PARCEL_COD_COLLECTED",
  PARCEL_COD_REMIT_REQUIRED: "PARCEL_COD_REMIT_REQUIRED",
  PARCEL_COD_REMITTED: "PARCEL_COD_REMITTED",
  PARCEL_COD_REMIT_REJECTED: "PARCEL_COD_REMIT_REJECTED",

  // G) Chat / support
  CHAT_MESSAGE: "CHAT_MESSAGE",
  CHAT_CONVERSATION_UPDATED: "CHAT_CONVERSATION_UPDATED",
  SUPPORT_ASSIGNED: "SUPPORT_ASSIGNED",

  // H) Driver state
  DRIVER_STATUS_CHANGED: "DRIVER_STATUS_CHANGED",
  DRIVER_LOCATION_UPDATED: "DRIVER_LOCATION_UPDATED",
  DRIVER_TRUST_SCORE_UPDATED: "DRIVER_TRUST_SCORE_UPDATED",
} as const;

export type RealtimeEventType = (typeof RealtimeEventTypes)[keyof typeof RealtimeEventTypes];

const LEGACY_EVENT_ALIASES: Record<string, string> = {
  // chat
  "chat.message": RealtimeEventTypes.CHAT_MESSAGE,

  // order
  ORDER_STATUS: RealtimeEventTypes.ORDER_UPDATED,
  STORE_STATUS: RealtimeEventTypes.ORDER_UPDATED,
  STORE_ORDER_UPDATED: RealtimeEventTypes.ORDER_UPDATED,

  // driver
  DRIVER_LOCATION: RealtimeEventTypes.DRIVER_LOCATION_UPDATED,
  DRIVER_JOB_UPDATED: RealtimeEventTypes.ORDER_UPDATED,
  DRIVER_JOB_STATUS: RealtimeEventTypes.ORDER_UPDATED,

  // dispatch offers
  OFFER_CANCELLED: RealtimeEventTypes.ORDER_SEARCH_CANCELLED,
  OFFER_TIMEOUT: RealtimeEventTypes.DRIVER_OFFER_EXPIRED,
};

export function normalizeRealtimeEventType(type: unknown): string {
  const t = String(type ?? "").trim();
  if (!t) return "";
  return LEGACY_EVENT_ALIASES[t] ?? t;
}

// Extract order/job id from common realtime payload shapes.
export function getRealtimeEventOrderId(evt: any): string {
  const e = evt ?? {};
  const direct =
    e.order_id ??
    e.job_id ??
    e.delivery_order_id ??
    e.id ??
    e.orderId ??
    e.jobId;

  const fromData =
    e.data?.order_id ??
    e.data?.job_id ??
    e.data?.delivery_order_id ??
    e.data?.id ??
    e.data?.orderId ??
    e.data?.jobId;

  const picked = direct ?? fromData;
  return String(picked ?? "").trim();
}

export const ORDER_REFRESH_EVENT_TYPES = new Set<string>([
  // order lifecycle
  RealtimeEventTypes.ORDER_CREATED,
  RealtimeEventTypes.ORDER_UPDATED,
  RealtimeEventTypes.ORDER_CANCELLED,
  RealtimeEventTypes.ORDER_EXPIRED,
  RealtimeEventTypes.ORDER_REDISPATCHED,
  RealtimeEventTypes.ORDER_SEARCH_CANCELLED,

  // dispatch & matching
  RealtimeEventTypes.DISPATCH_SEARCHING,
  RealtimeEventTypes.DRIVER_OFFERED,
  RealtimeEventTypes.DRIVER_OFFER_EXPIRED,
  RealtimeEventTypes.DRIVER_ASSIGNED,
  RealtimeEventTypes.DRIVER_REJECTED,
  RealtimeEventTypes.DRIVER_UNASSIGNED,

  // trip progress
  RealtimeEventTypes.DRIVER_EN_ROUTE_TO_PICKUP,
  RealtimeEventTypes.DRIVER_ARRIVED_PICKUP,
  RealtimeEventTypes.PICKED_UP,
  RealtimeEventTypes.EN_ROUTE_TO_DROPOFF,
  RealtimeEventTypes.ARRIVED_DROPOFF,
  RealtimeEventTypes.DELIVERED,
  RealtimeEventTypes.DELIVERY_CONFIRMED,

  // payments
  RealtimeEventTypes.PAYMENT_REQUIRED,
  RealtimeEventTypes.PAYMENT_SUBMITTED,
  RealtimeEventTypes.PAYMENT_VERIFIED,
  RealtimeEventTypes.PAYMENT_REJECTED,
  RealtimeEventTypes.REFUND_ISSUED,

  // store workflow
  RealtimeEventTypes.STORE_ACCEPTED,
  RealtimeEventTypes.STORE_PREP_STATUS_UPDATED,
  RealtimeEventTypes.STORE_READY,
  RealtimeEventTypes.STORE_CANCELLED,
  RealtimeEventTypes.ITEMS_UPDATED,

  // COD / OTP
  RealtimeEventTypes.COD_OTP_SENT,
  RealtimeEventTypes.COD_OTP_CONFIRMED,
  RealtimeEventTypes.COD_OTP_EXPIRED,
  RealtimeEventTypes.PARCEL_COD_COLLECTED,
  RealtimeEventTypes.PARCEL_COD_REMIT_REQUIRED,
  RealtimeEventTypes.PARCEL_COD_REMITTED,
  RealtimeEventTypes.PARCEL_COD_REMIT_REJECTED,

  // driver state
  RealtimeEventTypes.DRIVER_STATUS_CHANGED,
  RealtimeEventTypes.DRIVER_LOCATION_UPDATED,
]);

export function isOrderRefreshEventType(type: unknown): boolean {
  const t = normalizeRealtimeEventType(type);
  return ORDER_REFRESH_EVENT_TYPES.has(t);
}
