export type HealthService = string;

export type SystemHealth = {
  ok: boolean;
  timestamp: string | null;
  services: HealthService[] | HealthService | null;
};

export function normalizeHealthServices(services: SystemHealth["services"]): HealthService[] {
  if (!services) return [];
  if (Array.isArray(services)) {
    return services
      .map((svc) => String(svc).trim())
      .filter((svc) => svc.length > 0);
  }
  const single = String(services).trim();
  return single ? [single] : [];
}

export type HealthSeverity = "ok" | "warn" | "crit";

export type HealthServiceEntry = {
  id: string;
  label: string;
  raw: string;
  severity: HealthSeverity;
};

export type HealthSeverityCounts = Record<HealthSeverity, number>;

function detectSeverity(token: string | undefined, fallbackOk: boolean): HealthSeverity {
  if (!token) return fallbackOk ? "ok" : "warn";
  const normalized = token.trim().toLowerCase();
  if (normalized === "ok") return "ok";
  if (normalized === "warn" || normalized === "warning") return "warn";
  if (normalized === "crit" || normalized === "critical" || normalized === "error") return "crit";
  return fallbackOk ? "ok" : "warn";
}

export function parseHealthServices(
  services: SystemHealth["services"],
  fallbackOk = true
): HealthServiceEntry[] {
  const normalized = normalizeHealthServices(services);
  return normalized.map((raw, idx) => {
    const [maybeSeverity, ...rest] = raw.split(":");
    const hasSeverityPrefix = rest.length > 0;
    const label = hasSeverityPrefix ? rest.join(":").trim() || maybeSeverity : raw;
    const severityToken = hasSeverityPrefix ? maybeSeverity : undefined;
    const severity = detectSeverity(severityToken, fallbackOk);
    return {
      id: `${idx}-${label}`,
      label: label.length ? label : raw,
      raw,
      severity,
    };
  });
}

export function summarizeHealth(entries: HealthServiceEntry[]): HealthSeverityCounts {
  return entries.reduce<HealthSeverityCounts>(
    (acc, entry) => {
      acc[entry.severity] += 1;
      return acc;
    },
    { ok: 0, warn: 0, crit: 0 }
  );
}

export type SystemStatusCheck = {
  ok: boolean;
  latency_ms?: number | null;
};

export type SystemStatusResponse = {
  ok: boolean;
  time: string;
  app?: {
    name?: string;
    env?: string;
    debug?: boolean;
    version?: string;
    commit?: string;
  };
  runtime?: {
    php?: string;
    laravel?: string;
  };
  checks?: Record<string, SystemStatusCheck>;
  queue?: {
    connection?: string;
    failed_jobs: number | null;
  };
  metrics?: {
    orders_by_status?: Record<string, number>;
    dispatch_attempts_by_status?: Record<string, number>;
  };
};

export function booleanToSeverity(ok: boolean | null | undefined): HealthSeverity {
  if (ok === true) return "ok";
  if (ok === false) return "crit";
  return "warn";
}
