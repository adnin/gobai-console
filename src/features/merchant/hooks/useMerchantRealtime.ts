import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";
import { isOrderRefreshEventType, normalizeRealtimeEventType } from "@/lib/realtimeEvents";

/**
 * Merchant board: listen for order-related realtime events and refresh lanes.
 */
export function useMerchantRealtime() {
  const qc = useQueryClient();

  React.useEffect(() => {
    const s = getSocket();

    const handlePayload = (payload: any) => {
      const type = normalizeRealtimeEventType(payload?.type ?? payload?.event?.type ?? payload?.data?.type);
      const evt = payload?.event ?? payload;
      const t = type || normalizeRealtimeEventType(evt?.type);
      if (!t) return;

      if (isOrderRefreshEventType(t)) {
        qc.invalidateQueries({ queryKey: ["merchant-orders"] });
      }
    };

    const onEvent = (p: any) => handlePayload(p);
    s.on("event", onEvent);
    s.on("realtime:event", onEvent);
    s.on("message", onEvent);

    const onAny = (_name: string, p: any) => {
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
