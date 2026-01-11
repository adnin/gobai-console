import { envStr } from "@/lib/http";

export function offerTtlSeconds(): number {
  const s = envStr("VITE_OFFER_TTL_SECONDS", "70");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 70;
}

export function computeExpiresAt(offeredAtIso?: string | null): string | null {
  if (!offeredAtIso) return null;
  const t = new Date(offeredAtIso).getTime();
  if (!Number.isFinite(t)) return null;
  const exp = t + offerTtlSeconds() * 1000;
  return new Date(exp).toISOString();
}

export function msRemaining(expiresAtIso?: string | null): number {
  if (!expiresAtIso) return 0;
  const t = new Date(expiresAtIso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, t - Date.now());
}
