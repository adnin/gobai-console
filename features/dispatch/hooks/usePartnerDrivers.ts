import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { partnerListDrivers } from "../api/partnerApi";
import { mapApiDriverProfileToOpsDriver } from "../mappers";
import type { OpsDriver } from "../types";

export function usePartnerDrivers(params?: { q?: string }) {
  const { token } = useAuth();

  return useQuery<OpsDriver[]>({
    queryKey: ["partner-drivers", params?.q ?? ""],
    enabled: !!token,
    queryFn: async () => {
      const res = await partnerListDrivers(token as string, {
        q: params?.q,
        per_page: 100,
        page: 1,
        status: "approved",
      });
      return (res.data ?? []).map(mapApiDriverProfileToOpsDriver);
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    staleTime: 5_000,
  });
}
