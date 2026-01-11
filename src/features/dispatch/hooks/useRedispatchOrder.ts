import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { opsRedispatchOrder } from "../api/opsApi";
import { partnerRedispatchOrder } from "../api/partnerApi";

/**
 * Ops-side redispatch:
 * - Clears any active offer (if expired) and triggers the dispatch engine to offer the next driver.
 * - UI should still respect lock timers (offer TTL + ops buffer) to avoid "thrash".
 */
export function useRedispatchOrder(opts?: { mode?: "ops" | "partner" }) {
  const { token } = useAuth();
  const qc = useQueryClient();

  const mode = opts?.mode ?? "ops";
  const baseOrdersKey: any[] = mode === "partner" ? ["partner-orders"] : ["ops-orders"];
  const baseDriversKey: any[] = mode === "partner" ? ["partner-drivers"] : ["ops-drivers"];

  return useMutation({
    mutationFn: async (input: { orderId: number; note?: string }) => {
      if (!token) throw new Error("Missing token");
      return mode === "partner" ? partnerRedispatchOrder(token, input) : opsRedispatchOrder(token, input);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: baseOrdersKey });
      qc.invalidateQueries({ queryKey: baseDriversKey });
    },
  });
}
