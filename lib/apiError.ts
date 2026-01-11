import { ApiError } from "@/lib/http";

type AnyObj = Record<string, any>;

function isObj(v: any): v is AnyObj {
  return v !== null && typeof v === "object";
}

function pickFirstError(errors: any): string | null {
  if (!isObj(errors)) return null;

  // Prefer wallet errors first (common in GOBAI flows)
  if (Array.isArray((errors as any).wallet) && (errors as any).wallet[0]) {
    return String((errors as any).wallet[0]);
  }

  const keys = Object.keys(errors);
  for (const k of keys) {
    const v = (errors as any)[k];
    if (Array.isArray(v) && v[0]) return String(v[0]);
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

export function getErrorRid(err: any): string | null {
  const payload = isObj(err) ? (err as any).payload ?? (err as any).data : null;
  const rid = (isObj(payload) && (payload as any).rid) || (isObj(err) && (err as any).rid);
  return rid ? String(rid) : null;
}

/**
 * Extract a user-facing message from:
 * - Laravel 422: { message, errors: { field: [msg] } }
 * - ApiError(payload)
 * - plain Error
 */
export function getErrorMessage(err: any, fallback = "Request failed"): string {
  if (err instanceof Error && err.message) return err.message;

  if (err instanceof ApiError) {
    const payload = err.payload;
    if (isObj(payload)) {
      const v = pickFirstError((payload as any).errors);
      if (v) return v;
      const m = (payload as any).message;
      if (typeof m === "string" && m.trim()) return m;
    }
    return err.message || fallback;
  }

  const payload = isObj(err) ? (err as any).payload ?? (err as any).data : null;
  if (isObj(payload)) {
    const v = pickFirstError((payload as any).errors);
    if (v) return v;
    const m = (payload as any).message;
    if (typeof m === "string" && m.trim()) return m;
  }

  if (isObj(err) && typeof (err as any).message === "string" && (err as any).message.trim()) {
    return String((err as any).message);
  }

  return fallback;
}

export function formatToastError(err: any, fallback?: string): string {
  const msg = getErrorMessage(err, fallback ?? "Request failed");
  const rid = getErrorRid(err);
  return rid ? `${msg}\nRID: ${rid}` : msg;
}
