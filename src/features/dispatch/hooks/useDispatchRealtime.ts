import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";
import { isOrderRefreshEventType, normalizeRealtimeEventType } from "@/lib/realtimeEvents";

/**
 * Subscribes to realtime events and invalidates relevant queries.
 *
 * The realtime server implementation can differ in the event name.
 * We support:
 * - socket.emit('event', payload)
 * - socket.emit('realtime:event', payload)
 * - socket.emit('message', payload)
 * and also listen to socket.onAny as a fallback.
 */
export function useDispatchRealtime() {
  const qc = useQueryClient();

  React.useEffect(() => {
    const s = getSocket();

    const handlePayload = (payload: any) => {
      const type = normalizeRealtimeEventType(payload?.type ?? payload?.event?.type ?? payload?.data?.type);
      const evt = payload?.event ?? payload;
      const t = type || normalizeRealtimeEventType(evt?.type);

      if (!t) return;

      if (isOrderRefreshEventType(t)) {
        qc.invalidateQueries({ queryKey: ["ops-orders"] });
      }

      if (t === "DRIVER_STATUS_CHANGED" || t === "DRIVER_LOCATION_UPDATED" || t === "DRIVER_TRUST_SCORE_UPDATED") {
        qc.invalidateQueries({ queryKey: ["ops-drivers"] });
      }
    };

    const onEvent = (p: any) => handlePayload(p);

    s.on("event", onEvent);
    s.on("realtime:event", onEvent);
    s.on("message", onEvent);

    // Fallback: catch any event name
    const onAny = (_eventName: string, p: any) => {
      // ignore noisy internal events
      if (!p || typeof p !== "object") return;
      handlePayload(p);
    };
    s.onAny(onAny);

    return () => {
      s.off("event", onEvent);
      s.off("realtime:event", onEvent);
      s.off("message", onEvent);
      s.offAny(onAny);
    };
  }, [qc]);
}
