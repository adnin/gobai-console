import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { merchantListOrders, type MerchantOrderLite } from "../api/merchantApi";

export function useMerchantOrders(limit = 50) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["merchant-orders", limit],
    queryFn: async () => {
      const res = await merchantListOrders(token, limit);
      return (res?.data ?? []) as MerchantOrderLite[];
    },
  });
}
