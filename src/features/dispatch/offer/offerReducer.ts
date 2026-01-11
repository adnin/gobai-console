import type { OfferMap, OfferState } from "./offerTypes";
import { normalizeRealtimeEventType, RealtimeEventTypes, getRealtimeEventOrderId } from "@/lib/realtimeEvents";

export type OfferAction =
  | { type: "OFFER_SENT"; offer: OfferState }
  | { type: "OFFER_ACCEPTED"; orderId: number; driverId?: number; attemptId?: string | number }
  | { type: "OFFER_EXPIRED"; orderId: number; driverId?: number; attemptId?: string | number }
  | { type: "OFFER_REJECTED"; orderId: number; driverId?: number; attemptId?: string | number }
  | { type: "CLEAR_OFFER"; orderId: number }
  | { type: "REALTIME_EVENT"; evt: any };

function upsert(map: OfferMap, orderId: number, next: Partial<OfferState>): OfferMap {
  const prev = map[orderId];
  if (!prev) return map;
  return { ...map, [orderId]: { ...prev, ...next } };
}

export function offerReducer(state: OfferMap, action: OfferAction): OfferMap {
  switch (action.type) {
    case "OFFER_SENT": {
      return { ...state, [action.offer.orderId]: action.offer };
    }
    case "OFFER_ACCEPTED": {
      return upsert(state, action.orderId, {
        status: "accepted",
        driverId: action.driverId ?? state[action.orderId]?.driverId,
        attemptId: action.attemptId ?? state[action.orderId]?.attemptId,
        resolvedAt: new Date().toISOString(),
      });
    }
    case "OFFER_EXPIRED": {
      return upsert(state, action.orderId, {
        status: "expired",
        driverId: action.driverId ?? state[action.orderId]?.driverId,
        attemptId: action.attemptId ?? state[action.orderId]?.attemptId,
        resolvedAt: new Date().toISOString(),
      });
    }
    case "OFFER_REJECTED": {
      return upsert(state, action.orderId, {
        status: "rejected",
        driverId: action.driverId ?? state[action.orderId]?.driverId,
        attemptId: action.attemptId ?? state[action.orderId]?.attemptId,
        resolvedAt: new Date().toISOString(),
      });
    }
    case "CLEAR_OFFER": {
      const next = { ...state };
      delete next[action.orderId];
      return next;
    }
    case "REALTIME_EVENT": {
      const t = normalizeRealtimeEventType(action.evt?.type);
      const orderIdStr = getRealtimeEventOrderId(action.evt);
      const orderId = Number(orderIdStr || 0);
      if (!orderId) return state;

      if (t === RealtimeEventTypes.DRIVER_ASSIGNED) return offerReducer(state, { type: "OFFER_ACCEPTED", orderId });
      if (t === RealtimeEventTypes.DRIVER_OFFER_EXPIRED) return offerReducer(state, { type: "OFFER_EXPIRED", orderId });
      if (t === RealtimeEventTypes.DRIVER_REJECTED) return offerReducer(state, { type: "OFFER_REJECTED", orderId });

      return state;
    }
    default:
      return state;
  }
}
