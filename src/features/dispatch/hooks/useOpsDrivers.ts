import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { opsListDrivers } from "../api/opsApi";
import { mapApiDriverProfileToOpsDriver } from "../mappers";
import type { OpsDriver } from "../types";

export function useOpsDrivers(params?: { q?: string }) {
  const { token } = useAuth();

  return useQuery<OpsDriver[]>({
    queryKey: ["ops-drivers", params?.q ?? ""],
    enabled: !!token,
    queryFn: async () => {
      const res = await opsListDrivers(token as string, {
        q: params?.q,
        per_page: 100,
        page: 1,
        status: "approved",
      });
      return (res.data ?? []).map(mapApiDriverProfileToOpsDriver);
    },
    // ✅ Ops screens are realtime-driven; avoid background refetch storms.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    staleTime: 5_000,
  });
}
