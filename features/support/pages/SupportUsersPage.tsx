import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { supportSearchUsers } from "@/features/support/api/supportApi";

export function SupportUsersPage() {
  const { token } = useAuth();
  const [qText, setQText] = useState<string>("");
  const [role, setRole] = useState<string>("");

  const params = useMemo(
    () => ({ q: qText || undefined, role: role || undefined, per_page: 25, page: 1 }),
    [qText, role]
  );

  const q = useQuery({
    queryKey: ["support", "users", params],
    queryFn: async () => supportSearchUsers(String(token), params),
    enabled: !!token,
  });

  const rows = q.data?.data ?? [];

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">User Search</div>
          <div className="text-sm text-muted-foreground">Find customers, drivers, and merchants.</div>
        </div>
        <Button asChild variant="secondary">
          <Link to="/support">Support Home</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="mb-1 text-xs text-muted-foreground">Search</div>
              <Input value={qText} onChange={(e) => setQText(e.target.value)} placeholder="name / email / phone / id" />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Role</div>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">All</option>
                <option value="customer">Customer</option>
                <option value="driver">Driver</option>
                <option value="merchant">Merchant</option>
                <option value="partner_ops">Partner</option>
                <option value="ops">Ops</option>
                <option value="admin">Admin</option>
                <option value="support">Support</option>
                <option value="finance">Finance</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => q.refetch()} disabled={q.isFetching}>
                {q.isFetching ? "Searching…" : "Search"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setQText("");
                  setRole("");
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-4" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
          <div className="text-sm text-muted-foreground">{q.isLoading ? "Loading…" : `${rows.length} rows`}</div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Mobile</th>
                  <th className="px-3 py-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u: any) => (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">
                      <Link className="underline" to={`/support/users/${u.id}`}>#{u.id}</Link>
                    </td>
                    <td className="px-3 py-2">{u.name ?? "—"}</td>
                    <td className="px-3 py-2">{u.email ?? "—"}</td>
                    <td className="px-3 py-2">{u.mobile ?? "—"}</td>
                    <td className="px-3 py-2">{u.role_name ?? u.role?.name ?? "—"}</td>
                  </tr>
                ))}
                {!q.isLoading && rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {q.isError && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              Failed to load users. {(q.error as any)?.message ?? ""}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
