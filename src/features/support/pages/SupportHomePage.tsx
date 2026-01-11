import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supportOverview } from "@/features/support/api/supportApi";

export function SupportHomePage() {
  const { token } = useAuth();

  const q = useQuery({
    queryKey: ["support", "overview"],
    queryFn: async () => supportOverview(String(token)),
    enabled: !!token,
    refetchInterval: 15_000,
  });

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Support Console</div>
          <div className="text-sm text-muted-foreground">Disputes, investigations, and customer helpdesk tools.</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={q.data?.ok ? "default" : "secondary"}>{q.isLoading ? "Checking…" : q.data?.ok ? "API OK" : "Offline"}</Badge>
          <Button asChild variant="secondary" size="sm">
            <Link to="/support/disputes">Open Disputes</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disputes</CardTitle>
            <div className="text-sm text-muted-foreground">View, investigate, and resolve disputes.</div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button asChild className="w-full">
                <Link to="/support/disputes">Go to Disputes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders</CardTitle>
            <div className="text-sm text-muted-foreground">Search orders and add investigation notes.</div>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link to="/support/orders">Search Orders</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Assist</CardTitle>
            <div className="text-sm text-muted-foreground">Draft responses and open tickets fast.</div>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link to="/support/ai">Open AI Assist</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Knowledge Base</CardTitle>
            <div className="text-sm text-muted-foreground">Publish, update, and search KB content.</div>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link to="/support/kb">Manage KB</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tickets</CardTitle>
            <div className="text-sm text-muted-foreground">Track open conversations and replies.</div>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link to="/support/tickets">Open Tickets</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users</CardTitle>
            <div className="text-sm text-muted-foreground">Search users by name, email, or phone.</div>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link to="/support/users">Search Users</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 text-xs text-muted-foreground">
        Server time: {q.data?.time ?? "—"}
      </div>
    </div>
  );
}
