export type ApiErrorShape = { message?: string; errors?: Record<string, string[] | string> } | string | null;

export class ApiError extends Error {
  status?: number;
  payload?: ApiErrorShape;

  constructor(message: string, status?: number, payload?: ApiErrorShape) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Global API error handler.
 *
 * Goal: even if a screen forgets to catch an error and show a toast,
 * we can still surface the error message globally.
 */
let globalApiErrorHandler: ((err: ApiError) => void) | null = null;

export function setGlobalApiErrorHandler(fn: ((err: ApiError) => void) | null) {
  globalApiErrorHandler = fn;
}

export function emitGlobalApiError(err: ApiError) {
  try {
    globalApiErrorHandler?.(err);
  } catch {
    // never break the app because of a toast
  }
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

// ✅ Exported base URL for cases where we need raw `fetch` (e.g. multipart FormData uploads).
// Keep it aligned with apiFetch's internal base.
export const API_BASE_URL = API_BASE;

/**
 * Minimal fetch wrapper for a Laravel API.
 * - Adds JSON headers
 * - Adds Bearer token if provided
 * - Throws ApiError on non-2xx
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null; silent?: boolean }
): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const token = (init as any)?.token ?? null;

  const headers = new Headers(init?.headers ?? {});
  headers.set("Accept", "application/json");

  const hasBody = init?.body !== undefined && init?.body !== null;
  if (hasBody && !(headers.has("Content-Type"))) {
    headers.set("Content-Type", "application/json");
  }

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    const ct = res.headers.get("content-type") ?? "";
    let payload: ApiErrorShape = null;

    try {
      payload = ct.includes("application/json") ? await res.json() : await res.text();
    } catch {
      payload = null;
    }

    const msg = (() => {
      if (typeof payload === "object" && payload) {
        const errors = (payload as any).errors;
        if (errors && typeof errors === "object") {
          // Prefer wallet error if present, else first field error
          const wallet = (errors as any).wallet;
          if (Array.isArray(wallet) && wallet[0]) return String(wallet[0]);
          const keys = Object.keys(errors);
          for (const k of keys) {
            const v = (errors as any)[k];
            if (Array.isArray(v) && v[0]) return String(v[0]);
            if (typeof v === "string" && v.trim()) return v;
          }
        }
        if ("message" in payload && (payload as any).message) return String((payload as any).message);
      }
      if (typeof payload === "string" && payload) return payload;
      return `Request failed (${res.status})`;
    })();

    const err = new ApiError(String(msg), res.status, payload);
    if (!(init as any)?.silent) emitGlobalApiError(err);
    throw err;
  }

  // handle empty responses
  if (res.status === 204) return undefined as unknown as T;

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;

  // fallback
  return (await res.text()) as unknown as T;
}

export function envStr(key: string, fallback: string) {
  const v = (import.meta as any).env?.[key];
  return typeof v === "string" && v.length ? v : fallback;
}

export function envBool(key: string, fallback = false) {
  const v = (import.meta as any).env?.[key];
  if (v === "1" || v === "true" || v === true) return true;
  if (v === "0" || v === "false" || v === false) return false;
  return fallback;
}
