import { useMemo, useState } from "react";
import { Activity, AlertTriangle, RefreshCw, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/apiError";
import { useSystemHealth, useSystemStatus } from "../hooks";
import {
  booleanToSeverity,
  parseHealthServices,
  summarizeHealth,
  type HealthServiceEntry,
  type HealthSeverity,
  type SystemStatusResponse,
} from "../types";

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, idx) => (
        <Card key={idx} className="animate-pulse">
          <CardHeader>
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="mt-2 h-3 w-48 rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-8 w-24 rounded bg-muted" />
            <div className="h-20 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function HealthDashboardPage() {
  const { viewer } = useAuth();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refetchInterval = autoRefresh ? 15_000 : false;
  const healthQuery = useSystemHealth({ enabled: !!viewer, refetchInterval });
  const statusQuery = useSystemStatus({ enabled: !!viewer, refetchInterval });
  const health = healthQuery.data;
  const systemStatus = statusQuery.data;
  const serviceEntries = useMemo<HealthServiceEntry[]>(
    () => parseHealthServices(health?.services ?? null, health?.ok ?? true),
    [health]
  );
  const rollups = useMemo(() => summarizeHealth(serviceEntries), [serviceEntries]);

  const healthUnauthorized = healthQuery.error && (healthQuery.error as any)?.status === 403;
  const statusUnauthorized = statusQuery.error && (statusQuery.error as any)?.status === 403;
  const isUnauthorized = healthUnauthorized || statusUnauthorized;
  const isError = healthQuery.isError && !isUnauthorized;
  const errorMessage = isError ? getErrorMessage(healthQuery.error, "Unable to load health status") : null;
  const statusError = statusQuery.isError && !isUnauthorized
    ? getErrorMessage(statusQuery.error, "Unable to load system status")
    : null;
  const isEmpty = !healthQuery.isLoading && !isError && serviceEntries.length === 0;

  if (!viewer) {
    return (
      <div className="p-6">
        <EmptyState
          title="Sign in required"
          description="Authenticate to view system health signals."
          icon={Shield}
          actions={
            <Button asChild>
              <a href="/login">Sign in</a>
            </Button>
          }
        />
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="p-6">
        <EmptyState
          title="Not permitted"
          description="Your role cannot view the system health dashboard."
          icon={Shield}
          actions={
            <Button asChild variant="secondary">
              <a href="/">Back to home</a>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Health dashboard</div>
          <div className="text-sm text-muted-foreground">Database, cache, and queue probes with service rollups.</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[color:var(--primary)]"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
            />
            Auto-refresh (15s)
          </label>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              healthQuery.refetch();
              statusQuery.refetch();
            }}
            disabled={healthQuery.isFetching || statusQuery.isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {healthQuery.isFetching || statusQuery.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {(healthQuery.isLoading && !health) || (statusQuery.isLoading && !systemStatus) ? <LoadingGrid /> : null}

      {isError ? (
        <EmptyState
          title="Could not load health"
          description={errorMessage ?? "Please retry or check your access."}
          icon={AlertTriangle}
          actions={
            <Button size="sm" onClick={() => healthQuery.refetch()} disabled={healthQuery.isFetching}>
              Retry
            </Button>
          }
        />
      ) : null}

      {health ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-col gap-1">
              <CardTitle className="text-base">Overall</CardTitle>
              <div className="text-sm text-muted-foreground">Rollup status, severity counts, and raw payload.</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={health.ok ? "success" : "danger"}>{health.ok ? "OK" : "CRIT"}</Badge>
                <div className="text-sm text-muted-foreground">Last checked: {formatTime(health.timestamp)}</div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(["ok", "warn", "crit"] as HealthSeverity[]).map((severity) => (
                  <div key={severity} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">{severity.toUpperCase()}</div>
                    <div className="text-2xl font-semibold">{rollups[severity]}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Raw payload</div>
                <pre className="mt-2 max-h-60 overflow-auto text-xs font-mono">
                  {JSON.stringify(health, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-1">
              <CardTitle className="text-base">Services</CardTitle>
              <div className="text-sm text-muted-foreground">Checks reported by the API.</div>
            </CardHeader>
            <CardContent>
              {serviceEntries.length ? (
                <div className="space-y-2">
                  {serviceEntries.map((svc) => (
                    <div
                      key={svc.id}
                      className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{svc.label}</span>
                      <Badge variant={severityVariant[svc.severity]}>{svc.severity.toUpperCase()}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No services reported in this probe.</div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {systemStatus ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-col gap-1">
              <CardTitle className="text-base">Infrastructure checks</CardTitle>
              <div className="text-sm text-muted-foreground">DB and cache connectivity + latency.</div>
            </CardHeader>
            <CardContent className="space-y-3">
              {getInfraRows(systemStatus).map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-semibold">{row.label}</div>
                    {typeof row.latency === "number" ? (
                      <div className="text-xs text-muted-foreground">Latency: {row.latency} ms</div>
                    ) : null}
                  </div>
                  <Badge variant={severityVariant[row.severity]}>{row.severity.toUpperCase()}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-1">
              <CardTitle className="text-base">Queue heartbeat</CardTitle>
              <div className="text-sm text-muted-foreground">Workers, failed jobs, and last heartbeat.</div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Connection</div>
                  <div className="text-sm font-medium">{systemStatus.queue?.connection ?? "—"}</div>
                </div>
                <Badge variant={severityVariant[queueSeverity(systemStatus)]}>
                  {queueSeverity(systemStatus).toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Failed jobs</div>
                  <div className="text-sm font-medium">{formatFailedJobs(systemStatus.queue?.failed_jobs)}</div>
                </div>
                <Badge variant={severityVariant[failedJobsSeverity(systemStatus.queue?.failed_jobs)]}>
                  {failedJobsSeverity(systemStatus.queue?.failed_jobs).toUpperCase()}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">Last heartbeat: {formatTime(systemStatus.time)}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {statusError ? (
        <div className="rounded-lg border border-border bg-destructive/5 p-4 text-sm text-destructive">
          {statusError}
        </div>
      ) : null}

      {isEmpty && !healthQuery.isLoading ? (
        <EmptyState
          title="No health services yet"
          description="The health endpoint returned no services. Try refreshing or verify the probe configuration."
          icon={Activity}
          actions={
            <Button size="sm" onClick={() => healthQuery.refetch()} disabled={healthQuery.isFetching}>
              Refresh
            </Button>
          }
        />
      ) : null}
    </div>
  );
}

const severityVariant: Record<HealthSeverity, "success" | "warning" | "danger"> = {
  ok: "success",
  warn: "warning",
  crit: "danger",
};

type InfraRow = {
  id: string;
  label: string;
  latency: number | null;
  severity: HealthSeverity;
};

function getInfraRows(status?: SystemStatusResponse): InfraRow[] {
  const checks = status?.checks ?? {};
  const entries = Object.entries(checks).map<InfraRow>(([key, value]) => ({
    id: key,
    label: formatCheckLabel(key),
    latency: typeof value.latency_ms === "number" ? value.latency_ms : null,
    severity: booleanToSeverity(value.ok),
  }));
  if (!entries.length) {
    return [{ id: "none", label: "No checks reported", latency: null, severity: "warn" }];
  }
  return entries;
}

function formatCheckLabel(key: string) {
  const lower = key.toLowerCase();
  if (lower === "db" || lower === "database") return "Database";
  if (lower === "cache" || lower === "redis") return "Redis/Cache";
  return key.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function queueSeverity(status?: SystemStatusResponse): HealthSeverity {
  if (!status?.queue) return status?.ok ? "ok" : "warn";
  return status.queue.failed_jobs && status.queue.failed_jobs > 0 ? "crit" : status.ok ? "ok" : "warn";
}

function failedJobsSeverity(failedJobs: number | null | undefined): HealthSeverity {
  if (typeof failedJobs === "number") {
    if (failedJobs === 0) return "ok";
    if (failedJobs <= 5) return "warn";
    return "crit";
  }
  return "warn";
}

function formatFailedJobs(value: number | null | undefined) {
  if (typeof value === "number") return value.toLocaleString();
  return "n/a";
}
