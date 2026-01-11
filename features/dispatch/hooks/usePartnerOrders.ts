import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { partnerListOrders } from "../api/partnerApi";
import { mapApiOrderToDispatchOrder } from "../mappers";
import type { DispatchOrder } from "../types";

export function usePartnerOrders(params?: { store_status?: string; dispatch_status?: string; today?: boolean }) {
  const { token } = useAuth();

  return useQuery<DispatchOrder[]>({
    queryKey: ["partner-orders", params?.store_status ?? "", params?.dispatch_status ?? "", params?.today ? "1" : "0"],
    enabled: !!token,
    queryFn: async () => {
      const res = await partnerListOrders(token as string, {
        store_status: params?.store_status,
        dispatch_status: params?.dispatch_status,
        today: params?.today,
        per_page: 100,
        page: 1,
      });
      return (res.data ?? []).map(mapApiOrderToDispatchOrder);
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    staleTime: 5_000,
  });
}
