import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { opsOfferDriver } from "../api/opsApi";
import { partnerOfferDriver } from "../api/partnerApi";
import type { DispatchOrder } from "../types";
import { computeExpiresAt } from "../offer/offerTime";

/**
 * Legacy name kept to avoid rewriting imports everywhere.
 * In the Command Center we treat this as a MANUAL OFFER (not an instant assignment).
 *
 * Backend today may still "hard assign" on this endpoint.
 * If your backend returns an "attempt" with offered_at/expires_at, we show the pending timer.
 * If it returns order.driver_id, we treat it as accepted immediately.
 */
export function useAssignDriver(opts?: { mode?: "ops" | "partner" }) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const mode = opts?.mode ?? "ops";
  const baseOrdersKey: any[] = mode === "partner" ? ["partner-orders"] : ["ops-orders"];
  const baseDriversKey: any[] = mode === "partner" ? ["partner-drivers"] : ["ops-drivers"];

  return useMutation({
    mutationFn: async (input: { orderId: number; driverId: number; note?: string }) => {
      if (!token) throw new Error("Missing token");
      return mode === "partner" ? partnerOfferDriver(token, input) : opsOfferDriver(token, input);
    },

    onMutate: async ({ orderId, driverId }) => {
      // optimistic UI: move to offered lane
      await qc.cancelQueries({ queryKey: baseOrdersKey });

      const snapshots = qc.getQueriesData<DispatchOrder[]>({ queryKey: baseOrdersKey });

      for (const [key, prev] of snapshots) {
        if (!prev || !Array.isArray(prev)) continue;
        qc.setQueryData<DispatchOrder[]>(key, prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                dispatchStatus: "offered",
                rawDispatchStatus: "offered",
                lastDispatchAttemptAt: new Date().toISOString(),
                driverId: o.driverId ?? null,
              }
            : o
        ));
      }

      return { snapshots };
    },

    onError: (_err, _vars, ctx) => {
      for (const [key, data] of (ctx?.snapshots ?? [])) {
        qc.setQueryData(key, data);
      }
    },

    onSettled: () => {
      // realtime should update quickly; still refresh to be safe
      qc.invalidateQueries({ queryKey: baseOrdersKey });
      qc.invalidateQueries({ queryKey: baseDriversKey });
    },
  });
}
