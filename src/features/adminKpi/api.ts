import { apiFetch } from "@/lib/http";
import type { SystemStatusResponse } from "./types";

export async function fetchSystemStatus(token: string): Promise<SystemStatusResponse> {
  return apiFetch<SystemStatusResponse>("/system/status", { method: "GET", token });
}
