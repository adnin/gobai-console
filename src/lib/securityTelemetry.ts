export type SecurityEvent = {
  rid: string;
  status?: number;
  code: string;
  path?: string;
  method?: string;
  source: "http" | "socket";
  detail?: string;
};

const listeners = new Set<(event: SecurityEvent) => void>();

export function onSecurityEvent(listener: (event: SecurityEvent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSecurityEvent(event: SecurityEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Never break app flow due to telemetry listener faults.
    }
  }

  try {
    window.dispatchEvent(new CustomEvent("security:event", { detail: event }));
  } catch {
    // Ignore in non-browser contexts (tests/SSR)
  }
}
