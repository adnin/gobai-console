import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SystemHomePage() {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>System Console</CardTitle>
          <div className="text-sm text-muted-foreground">Operational tools, feature flags, maintenance actions.</div>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            Starter placeholder. Add your modules/routes here later.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
