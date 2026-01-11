import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export function UnauthorizedPage() {
  const { viewer } = useAuth();
  const roles = viewer?.roles ?? [];
  const showApply = !!viewer && !roles.includes("partner");

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
          <div className="text-sm text-muted-foreground">
            You don’t have access to this module with your current role.
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            Current roles: <span className="font-medium">{roles.length ? roles.join(", ") : "none"}</span>
          </div>

          {showApply && (
            <div className="rounded-lg border p-3 text-sm">
              If you’re trying to become a partner, submit an application and we’ll review it.
              <div className="mt-3">
                <a
                  href="/partner/apply"
                  className={cn(buttonVariants({ variant: "default" }), "w-full")}
                >
                  Apply as Partner
                </a>
              </div>
            </div>
          )}

          <a href="/login" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
            Back to Login
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
