import { describe, expect, test } from "vitest";
import { hasAnyRole, hasRole, requireAnyRole, type Viewer } from "@/lib/rbac";
import { defaultRouteForViewer } from "@/lib/defaultRoute";

describe("rbac", () => {
  test("hasRole/hasAnyRole basics", () => {
    const viewer: Viewer = { id: 1, name: "A", roles: ["ops", "merchant"] };

    expect(hasRole(viewer, "ops")).toBe(true);
    expect(hasRole(viewer, "admin")).toBe(false);

    expect(hasAnyRole(viewer, ["admin", "merchant"])).toBe(true);
    expect(hasAnyRole(viewer, ["finance", "support"])).toBe(false);
    expect(requireAnyRole(viewer, ["ops"])).toBe(true);
  });

  test("defaultRouteForViewer is deterministic (priority order)", () => {
    const base: Omit<Viewer, "roles"> = { id: 1, name: "A" };

    expect(defaultRouteForViewer({ ...base, roles: ["system", "admin"] })).toBe("/system");
    expect(defaultRouteForViewer({ ...base, roles: ["admin", "ops"] })).toBe("/admin");
    expect(defaultRouteForViewer({ ...base, roles: ["ops", "merchant"] })).toBe("/ops");
    expect(defaultRouteForViewer({ ...base, roles: ["merchant"] })).toBe("/merchant");
    expect(defaultRouteForViewer({ ...base, roles: ["support"] })).toBe("/support");
    expect(defaultRouteForViewer({ ...base, roles: ["finance"] })).toBe("/finance");

    // No console role yet (e.g., onboarding)
    expect(defaultRouteForViewer({ ...base, roles: [] })).toBe("/partner/apply");
  });
});
