const RID_PREFIX = "web";

function fallbackUuid(): string {
  const now = Date.now().toString(16);
  const rand = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
  return `${now}-${rand}`;
}

export function generateRequestId(): string {
  try {
    const candidate =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : fallbackUuid();

    return `${RID_PREFIX}-${candidate}`;
  } catch {
    return `${RID_PREFIX}-${fallbackUuid()}`;
  }
}

export function ensureRequestId(existing?: string | null): string {
  const value = (existing ?? "").trim();
  if (value) return value;
  return generateRequestId();
}
