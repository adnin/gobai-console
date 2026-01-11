import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { opsExplainStuck, type OpsExplainStuckResponse } from "@/features/dispatch/api/opsApi";

function SummaryBlock({ data }: { data?: OpsExplainStuckResponse | null }) {
  if (!data) return <div className="text-sm text-muted-foreground">No response yet.</div>;

  const blockers = data.state_machine?.blockers ?? [];
  const actions = data.suggested_next_actions ?? [];

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explanation</div>
        <div className="mt-2 rounded-lg border border-border bg-background/80 p-3">
          {data.explanation ?? "No explanation returned."}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {data.state_machine?.current_state ? (
          <Badge variant="secondary">State {data.state_machine.current_state}</Badge>
        ) : null}
        {data.rid ? <Badge variant="outline">RID {data.rid}</Badge> : null}
        {data.ai_meta?.model ? <Badge variant="outline">{data.ai_meta.model}</Badge> : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blockers</div>
          <div className="mt-2 space-y-2">
            {blockers.length === 0 ? (
              <div className="text-muted-foreground">No blockers reported.</div>
            ) : (
              blockers.map((blocker, idx) => (
                <div key={`${blocker.code}-${idx}`} className="rounded-md border border-border bg-background/80 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{blocker.code ?? "blocker"}</div>
                    {blocker.severity ? <Badge variant="warning">{blocker.severity}</Badge> : null}
                  </div>
                  {blocker.details ? <div className="mt-1 text-xs text-muted-foreground">{blocker.details}</div> : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested actions</div>
          <div className="mt-2 space-y-2">
            {actions.length === 0 ? (
              <div className="text-muted-foreground">No suggested actions.</div>
            ) : (
              actions.map((action, idx) => (
                <div key={`${action.action}-${idx}`} className="rounded-md border border-border bg-background/80 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{action.action ?? "action"}</div>
                    {action.priority ? <Badge variant="outline">{action.priority}</Badge> : null}
                  </div>
                  {action.payload ? (
                    <pre className="mt-2 overflow-auto rounded-md bg-muted/30 p-2 text-xs font-mono">
                      {JSON.stringify(action.payload, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OpsExplainStuckPage() {
  const { token } = useAuth();

  const [orderId, setOrderId] = useState<string>("456");
  const [includeAi, setIncludeAi] = useState<boolean>(true);

  const parsedOrderId = useMemo(() => Number(orderId), [orderId]);
  const canSubmit = Number.isFinite(parsedOrderId) && parsedOrderId > 0;

  const m = useMutation({
    mutationFn: async () => opsExplainStuck(String(token), { orderId: parsedOrderId, includeAi }),
  });

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Ops Diagnostics</div>
          <div className="text-sm text-muted-foreground">
            Explain why an order is stuck and highlight recommended actions.
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link to="/ops/dispatch">Back to Dispatch</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Explain stuck order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Order ID</div>
              <Input value={orderId} onChange={(event) => setOrderId(event.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => m.mutate()} disabled={!canSubmit || m.isPending}>
                {m.isPending ? "Analyzing..." : "Explain"}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="include-ai"
              type="checkbox"
              className="h-4 w-4 accent-[color:var(--primary)]"
              checked={includeAi}
              onChange={(event) => setIncludeAi(event.target.checked)}
            />
            <label htmlFor="include-ai" className="text-sm font-medium">
              Include AI meta
            </label>
          </div>

          {m.isError ? (
            <div className="text-sm text-destructive">{(m.error as any)?.message ?? "Failed to load"}</div>
          ) : null}
        </CardContent>
      </Card>

      <Separator className="my-4" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <SummaryBlock data={m.data} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Raw response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[420px] overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono">
              {m.data ? JSON.stringify(m.data, null, 2) : "No response yet."}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
