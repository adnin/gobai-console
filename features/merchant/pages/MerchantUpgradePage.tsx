import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { merchantGetSubscription, merchantUpgradeSubscription } from "../api/merchantApi";

type SubResp = {
  base_limit: number;
  extra_slots: number;
  monthly_credits_per_extra_slot: number;
  active_until: string | null;
  allowed_products: number;
};

export default function MerchantUpgradePage() {
  const { token } = useAuth();
  const nav = useNavigate();

  const subQ = useQuery({
    queryKey: ["merchant-subscription"],
    queryFn: async () => merchantGetSubscription(token) as Promise<SubResp>,
    enabled: !!token,
  });

  const [extraSlots, setExtraSlots] = React.useState<number>(1);
  React.useEffect(() => {
    if (subQ.data?.extra_slots != null) {
      setExtraSlots(Math.max(1, Number(subQ.data.extra_slots) || 1));
    }
  }, [subQ.data?.extra_slots]);

  const pricePer = subQ.data?.monthly_credits_per_extra_slot ?? 20;
  const cost = pricePer * Math.max(1, extraSlots);

  const up = useMutation({
    mutationFn: async () =>
      merchantUpgradeSubscription(token, {
        extra_slots: Math.max(1, extraSlots),
        months: 1,
      }),
    onSuccess: () => {
      subQ.refetch();
    },
  });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h1 className="text-xl font-semibold">Upgrade</h1>
          <p className="text-sm text-muted-foreground">
            Increase your product limit beyond the free tier.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => nav(-1)}>
            Back
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product slots subscription</CardTitle>
          <CardDescription>
            Free tier includes {subQ.data?.base_limit ?? 5} products. Each extra product slot costs {pricePer} credits/month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Allowed products</div>
              <div className="text-2xl font-semibold">
                {subQ.data?.allowed_products ?? "—"}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Extra slots</div>
              <div className="text-2xl font-semibold">
                {subQ.data?.extra_slots ?? "—"}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Active until</div>
              <div className="text-sm font-medium">
                {subQ.data?.active_until ? new Date(subQ.data.active_until).toLocaleString() : "Not active"}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-sm font-medium">Extra product slots</label>
              <Input
                type="number"
                min={1}
                max={200}
                value={extraSlots}
                onChange={(e) => setExtraSlots(Number(e.target.value || 1))}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Example: 2 extra slots = +2 products (billed monthly).
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Estimated cost (1 month)</div>
              <div className="text-2xl font-semibold">{cost} credits</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => up.mutate()}
              disabled={up.isPending || !token}
            >
              {up.isPending ? "Upgrading…" : "Upgrade now"}
            </Button>
            <Button variant="outline" onClick={() => nav("/merchant")}>Go to Merchant Board</Button>
          </div>

          {up.isError ? (
            <p className="text-sm text-destructive">{String((up.error as any)?.message ?? "Upgrade failed")}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
