import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { supportGetUser } from "@/features/support/api/supportApi";

function fmt(ts?: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function SupportUserDetailPage() {
  const { id } = useParams();
  const userId = Number(id);
  const { token } = useAuth();

  const q = useQuery({
    queryKey: ["support", "user", userId],
    queryFn: async () => supportGetUser(String(token), userId),
    enabled: !!token && Number.isFinite(userId) && userId > 0,
  });

  const user = q.data?.user;
  const orders = q.data?.recent_orders ?? [];

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">User #{userId}</div>
          <div className="text-sm text-muted-foreground">Profile & recent activity</div>
        </div>
        <Button asChild variant="secondary">
          <Link to="/support/users">Back</Link>
        </Button>
      </div>

      {q.isError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          Failed to load user. {(q.error as any)?.message ?? ""}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="font-medium">{user?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Role</div>
                <div className="font-medium">{user?.role_name ?? user?.role?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="font-medium">{user?.email ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Mobile</div>
                <div className="font-medium">{user?.mobile ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="font-medium">{fmt(user?.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Updated</div>
                <div className="font-medium">{fmt(user?.updated_at)}</div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="text-sm text-muted-foreground">
              Tip: If you need wallet or settlement investigation, forward the user ID to Finance.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <div className="text-sm text-muted-foreground">Last 20 orders where user is customer or driver.</div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">
                        <Link className="underline" to={`/support/orders/${o.id}`}>#{o.id}</Link>
                      </td>
                      <td className="px-3 py-2">{o.status ?? "—"}</td>
                      <td className="px-3 py-2">{o.total_price ?? "—"}</td>
                      <td className="px-3 py-2">{fmt(o.created_at ?? o.order_time)}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && !q.isLoading && (
                    <tr>
                      <td className="px-3 py-6 text-center text-muted-foreground" colSpan={4}>
                        No recent orders.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
