import * as React from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { adminRejectOrderPayment, adminVerifyOrderPayment } from "@/features/admin/api/adminApi";

export function AdminOrderPaymentPage() {
  const { token } = useAuth();
  const [orderId, setOrderId] = React.useState<string>("");
  const [result, setResult] = React.useState<any | null>(null);

  const verifyM = useMutation({
    mutationFn: async (id: number) => adminVerifyOrderPayment(String(token), id),
    onSuccess: (res) => setResult(res),
  });

  const rejectM = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => adminRejectOrderPayment(String(token), id, reason),
    onSuccess: (res) => setResult(res),
  });

  const busy = verifyM.isPending || rejectM.isPending;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Order Payment Verification</h1>
          <div className="text-sm text-muted-foreground">Verify/reject an order’s payment by ID (GCash/receipt flows).</div>
        </div>
        <Button asChild variant="secondary" size="sm"><Link to="/admin">Back</Link></Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verify payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Enter order id (e.g. 123)"
              inputMode="numeric"
            />
            <Button
              onClick={() => {
                const id = Number(orderId);
                if (!Number.isFinite(id) || id <= 0) return;
                verifyM.mutate(id);
              }}
              disabled={busy || !token}
            >
              Verify
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const id = Number(orderId);
                if (!Number.isFinite(id) || id <= 0) return;
                const reason = (prompt("Reject reason (required):") ?? "").trim();
                if (!reason) return;
                rejectM.mutate({ id, reason });
              }}
              disabled={busy || !token}
            >
              Reject
            </Button>
          </div>

          <Separator />

          {(verifyM.isError || rejectM.isError) && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              {(verifyM.error as any)?.message ?? (rejectM.error as any)?.message ?? "Request failed"}
            </div>
          )}

          {result && (
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 text-sm font-medium">Response</div>
              <pre className="max-h-80 overflow-auto text-xs leading-relaxed">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Tip: Most teams use the Receipts queue for day-to-day review. This tool is helpful for manual fixes / edge cases.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
