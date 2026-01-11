import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { partnerOverview, type PartnerOverview } from "../api/partnerApi";

export function usePartnerOverview(opts?: { enabled?: boolean }) {
  const { token } = useAuth();

  return useQuery<PartnerOverview>({
    queryKey: ["partner-overview"],
    enabled: !!token && (opts?.enabled ?? true),
    queryFn: async () => {
      const res = await partnerOverview(token as string);
      return res.data;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    staleTime: 5_000,
  });
}
