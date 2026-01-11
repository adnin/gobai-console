import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import {
  complianceSummaryCreate,
  complianceSummaryGet,
  complianceSummaryList,
  type ComplianceSummaryRow,
} from "@/features/system/api/systemComplianceApi";

function fmt(ts?: string) {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function SystemCompliancePage() {
  const { token } = useAuth();

  const [status, setStatus] = useState<string>("completed");
  const [perPage, setPerPage] = useState<string>("20");

  const listParams = useMemo(
    () => ({
      status: status || undefined,
      page: 1,
      per_page: Number(perPage) || 20,
    }),
    [status, perPage]
  );

  const listQ = useQuery({
    queryKey: ["system", "compliance", listParams],
    queryFn: async () => complianceSummaryList(String(token), listParams),
    enabled: !!token,
  });

  const rows = listQ.data?.data ?? [];

  const [detailIdInput, setDetailIdInput] = useState<string>("3001");
  const detailId = Number(detailIdInput);
  const hasDetailId = Number.isFinite(detailId) && detailId > 0;

  const detailQ = useQuery({
    queryKey: ["system", "compliance", "detail", detailId],
    queryFn: async () => complianceSummaryGet(String(token), detailId),
    enabled: !!token && hasDetailId,
  });

  const [createType, setCreateType] = useState<string>("incident_report");
  const [createSourceType, setCreateSourceType] = useState<string>("driver_trust_events");
  const [createSourceId, setCreateSourceId] = useState<string>("999");
  const [createPriority, setCreatePriority] = useState<string>("normal");
  const [createReason, setCreateReason] = useState<string>("weekly audit");
  const [createRequestedBy, setCreateRequestedBy] = useState<string>("1");
  const [optRedact, setOptRedact] = useState<boolean>(true);
  const [optTimeline, setOptTimeline] = useState<boolean>(true);
  const [optRiskFlags, setOptRiskFlags] = useState<boolean>(true);
  const sourceIdValue = Number(createSourceId);
  const canCreate = Number.isFinite(sourceIdValue) && sourceIdValue > 0 && createType.trim().length > 0;

  const createM = useMutation({
    mutationFn: async () => {
      if (!canCreate) throw new Error("Valid source ID required");
      return complianceSummaryCreate(String(token), {
        type: createType.trim(),
        source_type: createSourceType.trim(),
        source_id: sourceIdValue,
        priority: createPriority.trim() || undefined,
        meta: {
          requested_reason: createReason.trim() || undefined,
          requested_by_user_id: Number(createRequestedBy) || undefined,
        },
        options: {
          redact_pii: optRedact,
          include_timeline: optTimeline,
          include_risk_flags: optRiskFlags,
        },
      });
    },
  });

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Compliance Summaries</div>
          <div className="text-sm text-muted-foreground">
            Queue, list, and retrieve compliance summaries with redaction options.
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link to="/system">Back to System</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary list</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Status</div>
                  <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="">All</option>
                    <option value="queued">queued</option>
                    <option value="processing">processing</option>
                    <option value="completed">completed</option>
                    <option value="failed">failed</option>
                  </Select>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Per page</div>
                  <Input value={perPage} onChange={(event) => setPerPage(event.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={() => listQ.refetch()} disabled={listQ.isFetching}>
                    {listQ.isFetching ? "Loading..." : "Refresh"}
                  </Button>
                </div>
              </div>
              {listQ.isError ? (
                <div className="text-sm text-destructive">{(listQ.error as any)?.message ?? "Failed"}</div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Results</CardTitle>
              <div className="text-sm text-muted-foreground">{listQ.isLoading ? "Loading..." : `${rows.length} rows`}</div>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row: ComplianceSummaryRow) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-t border-border hover:bg-muted/20"
                        onClick={() => setDetailIdInput(String(row.id))}
                      >
                        <td className="px-3 py-2 font-medium">#{row.id}</td>
                        <td className="px-3 py-2">{row.type ?? "-"}</td>
                        <td className="px-3 py-2">{row.source_type ?? "-"}</td>
                        <td className="px-3 py-2">{row.status ?? "-"}</td>
                        <td className="px-3 py-2">{fmt(row.created_at)}</td>
                        <td className="px-3 py-2">{fmt(row.completed_at)}</td>
                      </tr>
                    ))}
                    {!listQ.isLoading && rows.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                          No summaries found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1">
                  <div className="mb-1 text-xs text-muted-foreground">Summary ID</div>
                  <Input value={detailIdInput} onChange={(event) => setDetailIdInput(event.target.value)} />
                </div>
                <Button onClick={() => detailQ.refetch()} disabled={!hasDetailId || detailQ.isFetching}>
                  {detailQ.isFetching ? "Loading..." : "Load"}
                </Button>
              </div>

              {detailQ.isError ? (
                <div className="text-sm text-destructive">{(detailQ.error as any)?.message ?? "Failed"}</div>
              ) : null}

              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                {detailQ.data ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold">{detailQ.data.type ?? "-"}</div>
                      {detailQ.data.status ? <Badge variant="secondary">{detailQ.data.status}</Badge> : null}
                      {detailQ.data.rid ? <Badge variant="outline">RID {detailQ.data.rid}</Badge> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {fmt(detailQ.data.created_at)} · Completed {fmt(detailQ.data.completed_at)}
                    </div>
                    <Separator />
                    <pre className="max-h-[320px] overflow-auto rounded-lg bg-background/80 p-3 text-xs font-mono">
                      {JSON.stringify(detailQ.data.summary ?? {}, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-muted-foreground">No summary loaded.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Queue summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Type</div>
                <Input value={createType} onChange={(event) => setCreateType(event.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Source type</div>
                <Input value={createSourceType} onChange={(event) => setCreateSourceType(event.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Source ID</div>
                  <Input value={createSourceId} onChange={(event) => setCreateSourceId(event.target.value)} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Priority</div>
                  <Select value={createPriority} onChange={(event) => setCreatePriority(event.target.value)}>
                    <option value="low">low</option>
                    <option value="normal">normal</option>
                    <option value="high">high</option>
                  </Select>
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Requested reason</div>
                <Input value={createReason} onChange={(event) => setCreateReason(event.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Requested by user ID</div>
                <Input value={createRequestedBy} onChange={(event) => setCreateRequestedBy(event.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Options</div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[color:var(--primary)]"
                      checked={optRedact}
                      onChange={(event) => setOptRedact(event.target.checked)}
                    />
                    Redact PII
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[color:var(--primary)]"
                      checked={optTimeline}
                      onChange={(event) => setOptTimeline(event.target.checked)}
                    />
                    Include timeline
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[color:var(--primary)]"
                      checked={optRiskFlags}
                      onChange={(event) => setOptRiskFlags(event.target.checked)}
                    />
                    Include risk flags
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => createM.mutate()} disabled={createM.isPending || !canCreate}>
                  {createM.isPending ? "Queuing..." : "Queue summary"}
                </Button>
                {createM.isError ? (
                  <div className="text-sm text-destructive">{(createM.error as any)?.message ?? "Failed"}</div>
                ) : null}
                {createM.isSuccess ? (
                  <div className="text-sm text-emerald-600">
                    Queued summary #{createM.data?.summary_id ?? "-"}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Queued response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[280px] overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono">
                {createM.data ? JSON.stringify(createM.data, null, 2) : "No response yet."}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator className="my-6" />
    </div>
  );
}
