import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { fetchSystemHealth, fetchSystemStatus } from "./api";
import { healthKeys } from "./keys";
import type { SystemHealth, SystemStatusResponse } from "./types";

function ensureToken(token?: string | null) {
  if (!token) throw new Error("Not authenticated");
  return token;
}

type UseSystemQueryOptions = {
  enabled?: boolean;
  refetchInterval?: number | false;
};

export function useSystemHealth(options?: UseSystemQueryOptions) {
  const { token } = useAuth();
  const enabled = options?.enabled ?? true;
  const refetchInterval = options?.refetchInterval ?? false;
  const canQuery = !!token && enabled;

  return useQuery<SystemHealth, ApiError>({
    queryKey: healthKeys.root,
    queryFn: async () => fetchSystemHealth(ensureToken(token)),
    enabled: canQuery,
    staleTime: 15_000,
    refetchInterval,
  });
}

export function useSystemStatus(options?: UseSystemQueryOptions) {
  const { token } = useAuth();
  const enabled = options?.enabled ?? true;
  const refetchInterval = options?.refetchInterval ?? false;
  const canQuery = !!token && enabled;

  return useQuery<SystemStatusResponse, ApiError>({
    queryKey: healthKeys.status,
    queryFn: async () => fetchSystemStatus(ensureToken(token)),
    enabled: canQuery,
    staleTime: 15_000,
    refetchInterval,
  });
}
