import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { extractRolesFromUser } from "@/lib/auth";

describe("extractRolesFromUser", () => {
  it("maps backend role_name synonyms to console modules", () => {
    expect(extractRolesFromUser({ role_name: "operator" })).toEqual(["ops"]);
    expect(extractRolesFromUser({ role_name: "customer_support" })).toEqual(["support"]);
    expect(extractRolesFromUser({ role_name: "accounting" })).toEqual(["finance"]);
    expect(extractRolesFromUser({ role_name: "devops" })).toEqual(["system"]);
  });

  it("supports user.role object with name/slug", () => {
    expect(extractRolesFromUser({ role: { name: "ops" } })).toEqual(["ops"]);
    expect(extractRolesFromUser({ role: { slug: "merchant" } })).toEqual(["merchant"]);
  });

  it("supports roles array of strings/objects", () => {
    expect(extractRolesFromUser({ roles: ["admin", "ops", "ops"] })).toEqual(["admin", "ops"]);
    expect(extractRolesFromUser({ roles: [{ name: "support" }, { name: "finance" }] })).toEqual(["support", "finance"]);
  });

  it("filters unknown roles", () => {
    expect(extractRolesFromUser({ role_name: "driver" })).toEqual([]);
  });
});

describe("Auth API fetch integration", () => {
  const originalEnv = (import.meta as any).env;

  beforeEach(() => {
    (import.meta as any).env = {
      ...originalEnv,
      VITE_API_BASE_URL: "http://localhost:8000/api",
      VITE_AUTH_LOGIN_PATH: "/auth/login",
      VITE_AUTH_ME_PATH: "/user",
      VITE_AUTH_LOGOUT_PATH: "/auth/logout",
      VITE_AUTH_CSRF: "false",
    };

    vi.stubGlobal("fetch", vi.fn());
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    (import.meta as any).env = originalEnv;
  });

  it("login stores token + viewer (response shape {token,user})", async () => {
    const { AuthProvider, useAuth } = await import("@/lib/auth");
    const React = await import("react");
    const { render, act } = await import("@testing-library/react");

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ token: "1|abc", user: { id: 9, name: "Ops User", role_name: "ops" } }),
    });

    function Probe() {
      const { token, viewer, login } = useAuth();
      return (
        <div>
          <button onClick={() => login({ login: "ops@gobai.test", password: "password" })}>do</button>
          <div data-testid="token">{token ?? ""}</div>
          <div data-testid="role">{viewer?.roles?.[0] ?? ""}</div>
        </div>
      );
    }

    const { getByText, findByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await act(async () => {
      getByText("do").click();
    });

    expect((await findByTestId("token")).textContent).toBe("1|abc");
    expect((await findByTestId("role")).textContent).toBe("ops");
    expect(localStorage.getItem("dispatch_web_token")).toBe("1|abc");
    expect(localStorage.getItem("dispatch_web_viewer")).toContain("Ops User");

    // verify body uses {login,password}
    const init = (fetch as any).mock.calls[0][1];
    expect(init.body).toContain('"login"');
  });

  it("refreshMe calls /user with Bearer token and updates roles from role_name", async () => {
    const { AuthProvider, useAuth } = await import("@/lib/auth");
    const React = await import("react");
    const { render, act } = await import("@testing-library/react");

    localStorage.setItem("dispatch_web_token", "1|seed");

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ id: 1, name: "Control", role_name: "control_tower" }),
    });

    function Probe() {
      const { viewer, refreshMe } = useAuth();
      return (
        <div>
          <button onClick={() => refreshMe()}>me</button>
          <div data-testid="role">{viewer?.roles?.[0] ?? ""}</div>
        </div>
      );
    }

    const { getByText, findByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await act(async () => {
      getByText("me").click();
    });

    expect((await findByTestId("role")).textContent).toBe("ops");

    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toContain("/user");
    const init = call[1];
    expect(init.headers.get("Authorization")).toBe("Bearer 1|seed");
  });
});
