import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { opsListOrders } from "../api/opsApi";
import { mapApiOrderToDispatchOrder } from "../mappers";
import type { DispatchOrder } from "../types";

export function useOpsOrders(params?: { q?: string; status?: string }) {
  const { token } = useAuth();

  return useQuery<DispatchOrder[]>({
    queryKey: ["ops-orders", params?.q ?? "", params?.status ?? ""],
    enabled: !!token,
    queryFn: async () => {
      const res = await opsListOrders(token as string, {
        q: params?.q,
        status: params?.status ?? "pending",
        per_page: 100,
        page: 1,
      });
      return (res.data ?? []).map(mapApiOrderToDispatchOrder);
    },
    // ✅ Ops screens are realtime-driven; avoid background refetch storms.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    staleTime: 5_000,
  });
}
