import { apiFetch } from "@/lib/http";
import type { SystemHealth, SystemStatusResponse } from "./types";

export async function fetchSystemHealth(token: string) {
  return apiFetch<SystemHealth>("/system/health", { token });
}

export async function fetchSystemStatus(token: string) {
  return apiFetch<SystemStatusResponse>("/system/status", { token });
}
