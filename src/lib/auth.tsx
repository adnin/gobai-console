import * as React from "react";
import type { Role, Viewer } from "@/lib/rbac";
import { apiFetch, envBool, envStr } from "@/lib/http";

/**
 * Backend alignment (your api.zip):
 * - POST  /auth/login   expects { login, password }
 * - GET   /user         returns authenticated user (includes role_name accessor)
 * - Logout route may not exist; we clear token locally regardless.
 *
 * You can override paths via env:
 * - VITE_AUTH_LOGIN_PATH   default: /auth/login
 * - VITE_AUTH_ME_PATH      default: /user
 * - VITE_AUTH_LOGOUT_PATH  default: /auth/logout (optional)
 */
const LOGIN_PATH = envStr("VITE_AUTH_LOGIN_PATH", "/auth/login");
const ME_PATH = envStr("VITE_AUTH_ME_PATH", "/user");
const LOGOUT_PATH = envStr("VITE_AUTH_LOGOUT_PATH", "/auth/logout");

// Optional cookie-based CSRF if you ever switch to Sanctum SPA auth.
// For token auth, leave off.
const USE_CSRF = envBool("VITE_AUTH_CSRF", false);
const CSRF_PATH = envStr("VITE_AUTH_CSRF_PATH", "/sanctum/csrf-cookie");

type AuthState = {
  token: string | null;
  viewer: Viewer | null;
};

type AuthContextValue = AuthState & {
  login: (input: { login: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

const LS_TOKEN = "dispatch_web_token";
const LS_VIEWER = "dispatch_web_viewer";

function readJson<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Map backend role names to your canonical console modules.
 * Backend policies accept many synonyms (operator, dispatcher, accounting, devops, etc).
 * We normalize them into your UI roles:
 * - merchant, admin, ops, partner, driver, support, finance, system
 */
function canonicalizeRoleName(raw: unknown): Role | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;

  // direct hits
  const direct: Role[] = ["merchant", "admin", "ops", "partner", "driver", "support", "finance", "system"];
  if ((direct as string[]).includes(v)) return v as Role;

  // partner-ish (backend uses partner_ops)
  if (["partner_ops", "partner", "fleet", "dsp"].includes(v)) return "partner";

  // ops-ish
  if (["operator", "dispatcher", "control_tower"].includes(v)) return "ops";

  // partner-ish (fleet owner / DSP)
  if (["partner", "partner_ops", "fleet", "dsp"].includes(v)) return "partner";

  // support-ish
  if (["customer_support", "cs"].includes(v)) return "support";

  // finance-ish
  if (["accounting", "treasury"].includes(v)) return "finance";

  // system-ish
  if (["devops", "engineer"].includes(v)) return "system";

  // driver-ish
  if (["driver", "rider", "courier"].includes(v)) return "driver";

  return null;
}

export function extractRolesFromUser(user: any): Role[] {
  const out: Role[] = [];

  // Common fields you might have
  const candidates: unknown[] = [
    user?.role_name, // your User model appends this
    user?.role,      // could be string or object
    user?.role?.name,
    user?.role?.slug,
    user?.role_name ?? user?.roleName,
  ];

  for (const c of candidates) {
    const role = canonicalizeRoleName(c);
    if (role) out.push(role);
  }

  // Also support "roles" arrays (strings or {name})
  const roles = user?.roles;
  if (Array.isArray(roles)) {
    for (const r of roles) {
      const name = typeof r === "string" ? r : r?.name ?? r?.slug;
      const role = canonicalizeRoleName(name);
      if (role) out.push(role);
    }
  }

  return Array.from(new Set(out));
}

function normalizeLoginResponse(payload: any): { token: string; user: any } {
  const p = payload?.data && typeof payload.data === "object" ? payload.data : payload;

  const token =
    p?.token ??
    p?.access_token ??
    p?.plainTextToken ??
    p?.plain_text_token ??
    payload?.token ??
    payload?.access_token;

  const user = p?.user ?? payload?.user ?? p?.data ?? payload?.data;

  if (!token) throw new Error("Login response missing token");
  if (!user) throw new Error("Login response missing user");

  return { token: String(token), user };
}

function normalizeMeResponse(payload: any): any {
  const p = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  return p?.user ?? p?.data ?? p;
}

async function maybeCsrfCookie() {
  if (!USE_CSRF) return;
  try {
    await apiFetch(CSRF_PATH, { method: "GET" } as any);
  } catch {
    // ignore
  }
}

function makeViewerFromUser(user: any): Viewer {
  const roles = extractRolesFromUser(user);
  return {
    id: Number(user?.id ?? 0) || 0,
    name: String(user?.name ?? user?.full_name ?? user?.email ?? "User"),
    roles
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem(LS_TOKEN));
  const [viewer, setViewer] = React.useState<Viewer | null>(() => readJson<Viewer>(LS_VIEWER));

  const setSession = React.useCallback((nextToken: string | null, nextViewer: Viewer | null) => {
    if (nextToken) localStorage.setItem(LS_TOKEN, nextToken);
    else localStorage.removeItem(LS_TOKEN);

    if (nextViewer) localStorage.setItem(LS_VIEWER, JSON.stringify(nextViewer));
    else localStorage.removeItem(LS_VIEWER);

    setToken(nextToken);
    setViewer(nextViewer);
  }, []);

  const refreshMe = React.useCallback(async () => {
    if (!token) return;
    const payload = await apiFetch<any>(ME_PATH, { method: "GET", token });
    const user = normalizeMeResponse(payload);
    const v = makeViewerFromUser(user);
    setSession(token, v);
  }, [token, setSession]);

  const login = React.useCallback(async (input: { login: string; password: string }) => {
    await maybeCsrfCookie();
    const payload = await apiFetch<any>(LOGIN_PATH, {
      method: "POST",
      body: JSON.stringify({
        login: input.login,
        password: input.password
      })
    });
    const { token: t, user } = normalizeLoginResponse(payload);
    const v = makeViewerFromUser(user);
    setSession(t, v);
  }, [setSession]);

  const logout = React.useCallback(async () => {
    const t = token;
    // best-effort server revoke, but safe if endpoint doesn't exist
    try {
      if (t) await apiFetch(LOGOUT_PATH, { method: "POST", token: t });
    } catch {
      // ignore
    } finally {
      setSession(null, null);
    }
  }, [token, setSession]);

  React.useEffect(() => {
    if (token && (!viewer || (viewer.roles?.length ?? 0) === 0)) {
      refreshMe().catch(() => setSession(null, null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextValue = React.useMemo(
    () => ({ token, viewer, login, logout, refreshMe }),
    [token, viewer, login, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
