import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { defaultRouteForViewer } from "@/lib/defaultRoute";

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [loginValue, setLoginValue] = React.useState("admin@gobai.test");
  const [password, setPassword] = React.useState("Password123!");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({ login: loginValue.trim(), password });

      // Role-aware landing route (fixes merchant... etc)
      // Use localStorage snapshot because context state updates async.
      let viewerSnapshot: any = null;
      try {
        const raw = window.localStorage.getItem("dispatch_web_viewer");
        viewerSnapshot = raw ? JSON.parse(raw) : null;
      } catch {
        viewerSnapshot = null;
      }

      nav(defaultRouteForViewer(viewerSnapshot), { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <div className="text-sm text-muted-foreground">
            Backend expects <code>login</code> (email or username) + password.
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Email or Username</div>
              <Input value={loginValue} onChange={(e) => setLoginValue(e.target.value)} autoComplete="username" />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Password</div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>

            <div className="text-xs text-muted-foreground">
              Configure endpoints via <code>.env.local</code> if your routes differ.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
