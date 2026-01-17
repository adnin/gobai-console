import * as React from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { hasAnyRole, type Role } from "@/lib/rbac";
import { getErrorMessage } from "@/lib/apiError";
import { useToast } from "@/ui/toast/ToastProvider";
import { adminSearchUsers, adminUpdateUserRoles } from "@/features/admin/api/adminUsersApi";

type AdminUserRow = {
  id: number;
  name?: string | null;
  email?: string | null;
  mobile?: string | null;
  role_name?: string | null;
  role?: { name?: string | null } | string | null;
  roles?: Array<{ name?: string | null } | string> | null;
};

const ALLOWED_ROLES: Role[] = ["admin", "system"];
const ROLE_OPTIONS = [
  "customer",
  "driver",
  "merchant",
  "partner",
  "partner_ops",
  "fleet_admin",
  "dispatcher",
  "ops",
  "support",
  "finance",
  "finance_lite",
  "admin",
  "system",
];

function resolvePrimaryRole(user: AdminUserRow): string | null {
  if (user.role_name) return String(user.role_name);
  const role = user.role;
  if (typeof role === "string") return role;
  if (role && typeof role === "object" && role.name) return String(role.name);
  return null;
}

function resolveAdditionalRoles(user: AdminUserRow): string[] {
  const rolesRaw = Array.isArray(user.roles) ? user.roles : [];
  const normalized = rolesRaw
    .map((r) => {
      if (!r) return null;
      if (typeof r === "string") return r;
      if (typeof r === "object" && r.name) return String(r.name);
      return null;
    })
    .filter((r): r is string => !!r)
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  const primary = resolvePrimaryRole(user);
  const unique = Array.from(new Set(normalized));
  return primary ? unique.filter((r) => r !== primary) : unique;
}

function resolveCurrentRoles(user: AdminUserRow): string[] {
  const primary = resolvePrimaryRole(user);
  const additional = resolveAdditionalRoles(user);
  const combined = [...(primary ? [primary] : []), ...additional];
  return Array.from(new Set(combined.map((r) => r.trim()).filter((r) => r.length > 0)));
}

export function AdminUsersPage() {
  const { token, viewer } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  const allowed = hasAnyRole(viewer, ALLOWED_ROLES);

  const [qText, setQText] = React.useState<string>("");
  const [role, setRole] = React.useState<string>("");

  const [modalState, setModalState] = React.useState<{
    open: boolean;
    user: AdminUserRow | null;
    selectedRoles: string[];
    error: string | null;
  }>({ open: false, user: null, selectedRoles: [], error: null });

  const params = React.useMemo(
    () => ({ q: qText || undefined, role: role || undefined, per_page: 25, page: 1 }),
    [qText, role]
  );

  const usersQ = useQuery({
    queryKey: ["admin", "users", params],
    queryFn: async () => adminSearchUsers(String(token), params),
    enabled: !!token && allowed,
    refetchOnWindowFocus: false,
  });

  const updateRolesM = useMutation({
    mutationFn: async ({ userId, addRoles, removeRoles }: { userId: number; addRoles: string[]; removeRoles: string[] }) =>
      adminUpdateUserRoles(String(token), userId, { add_roles: addRoles, remove_roles: removeRoles }),
    onSuccess: async () => {
      toast.ok("Roles updated.");
      await qc.invalidateQueries({ queryKey: ["admin", "users"] });
      setModalState({ open: false, user: null, selectedRoles: [], error: null });
    },
    onError: (err) => {
      toast.err(getErrorMessage(err, "Failed to update roles"));
    },
  });

  const rows = usersQ.data?.data ?? [];
  const total = Number(usersQ.data?.meta?.total ?? rows.length);
  const isForbidden = (usersQ.error as any)?.status === 403;

  if (!allowed) {
    return (
      <div className="p-6">
        <EmptyState
          title="Access restricted"
          description="You need admin access to manage user roles."
          icon={Shield}
          actions={
            <Button asChild>
              <a href="/login">Sign in</a>
            </Button>
          }
        />
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="p-6">
        <EmptyState
          title="Not permitted"
          description="Your role cannot access admin user management."
          icon={Shield}
          actions={
            <Button asChild variant="secondary">
              <Link to="/admin">Back to admin home</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const openModal = (user: AdminUserRow) => {
    const current = resolveCurrentRoles(user);
    setModalState({ open: true, user, selectedRoles: current, error: null });
  };

  const closeModal = () => {
    if (updateRolesM.isPending) return;
    setModalState({ open: false, user: null, selectedRoles: [], error: null });
  };

  const submitRoles = () => {
    const user = modalState.user;
    if (!user) return;
    const currentRoles = resolveCurrentRoles(user);
    const selected = modalState.selectedRoles;
    const addRoles = selected.filter((role) => !currentRoles.includes(role));
    const removeRoles = currentRoles.filter((role) => !selected.includes(role));

    if (addRoles.length === 0 && removeRoles.length === 0) {
      setModalState((prev) => ({ ...prev, error: "Select at least one role change." }));
      return;
    }

    updateRolesM.mutate({ userId: user.id, addRoles, removeRoles });
  };

  const modalBusy = updateRolesM.isPending;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Admin Users</div>
          <div className="text-sm text-muted-foreground">Search users and manage role access.</div>
        </div>
        <Button asChild variant="secondary">
          <Link to="/admin">Admin Home</Link>
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
              <div className="mb-1 text-xs text-muted-foreground">Primary role</div>
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
                <option value="system">System</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => usersQ.refetch()} disabled={usersQ.isFetching}>
                {usersQ.isFetching ? "Searching…" : "Search"}
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
          <div className="text-sm text-muted-foreground">
            {usersQ.isLoading ? "Loading…" : `${total} users`}
          </div>
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
                  <th className="px-3 py-2">Primary role</th>
                  <th className="px-3 py-2">Additional roles</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u: AdminUserRow) => {
                  const primaryRole = resolvePrimaryRole(u) ?? "—";
                  const additional = resolveAdditionalRoles(u);
                  return (
                    <tr key={u.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">#{u.id}</td>
                      <td className="px-3 py-2">{u.name ?? "—"}</td>
                      <td className="px-3 py-2">{u.email ?? "—"}</td>
                      <td className="px-3 py-2">{u.mobile ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary">{primaryRole}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        {additional.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {additional.map((r) => (
                              <Badge key={`${u.id}-${r}`} variant="outline">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="secondary" onClick={() => openModal(u)}>
                          Manage roles
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!usersQ.isLoading && rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                      No users found. Try updating the search filters.
                    </td>
                  </tr>
                )}
                {usersQ.isLoading && (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                      Loading users…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {usersQ.isError && !isForbidden && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              Failed to load users. {(usersQ.error as any)?.message ?? ""}
              <div className="mt-2">
                <Button size="sm" variant="secondary" onClick={() => usersQ.refetch()} disabled={usersQ.isFetching}>
                  Retry
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={modalState.open} onClose={closeModal}>
        <DialogHeader>
          <DialogTitle>Update roles</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="font-medium">User #{modalState.user?.id}</div>
              <div className="text-muted-foreground">{modalState.user?.name ?? "—"}</div>
            </div>

            <div className="rounded-lg border border-border p-3 text-sm">
              <div className="font-medium">Current roles</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {resolveCurrentRoles(modalState.user ?? ({} as AdminUserRow)).length ? (
                  resolveCurrentRoles(modalState.user ?? ({} as AdminUserRow)).map((r) => (
                    <Badge key={`current-${r}`} variant="secondary">
                      {r}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs text-muted-foreground">Assign roles</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {ROLE_OPTIONS.map((roleOption) => {
                  const checked = modalState.selectedRoles.includes(roleOption);
                  return (
                    <label key={roleOption} className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={checked}
                        onChange={(e) => {
                          const nextChecked = e.target.checked;
                          setModalState((prev) => {
                            const set = new Set(prev.selectedRoles);
                            if (nextChecked) {
                              set.add(roleOption);
                            } else {
                              set.delete(roleOption);
                            }
                            return { ...prev, selectedRoles: Array.from(set), error: null };
                          });
                        }}
                      />
                      <span>{roleOption}</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Changes are saved when you confirm. Some roles may be rejected by the API if not allowed.
              </div>
            </div>

            {modalState.error && <div className="text-sm text-destructive">{modalState.error}</div>}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="secondary" onClick={closeModal} disabled={modalBusy}>
            Cancel
          </Button>
          <Button onClick={submitRoles} disabled={modalBusy}>
            {modalBusy ? "Updating…" : "Confirm update"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default AdminUsersPage;
