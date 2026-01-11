import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function LogoutPage() {
  const { logout } = useAuth();
  const nav = useNavigate();

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await logout();
      } finally {
        if (alive) nav("/login", { replace: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [logout, nav]);

  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-lg font-semibold">Logging out…</CardHeader>
        <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Clearing session and returning to sign in.
        </CardContent>
      </Card>
    </div>
  );
}
