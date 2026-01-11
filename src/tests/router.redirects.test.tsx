import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Viewer } from "@/lib/rbac";

let mockViewer: Viewer | null = null;

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ viewer: mockViewer }),
}));

async function renderHomeRedirect(viewer: Viewer | null) {
  mockViewer = viewer;
  const mod = await import("@/app/HomeRedirect");
  const HomeRedirect = mod.HomeRedirect;

  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route path="/ops" element={<div>OPS</div>} />
        <Route path="/merchant" element={<div>MERCHANT</div>} />
        <Route path="/admin" element={<div>ADMIN</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("router redirects", () => {
  test("unauthenticated / redirects to /login", async () => {
    await renderHomeRedirect(null);
    expect(await screen.findByText("LOGIN")).toBeInTheDocument();
  });

  test("ops role / redirects to /ops", async () => {
    await renderHomeRedirect({ id: 1, name: "Ops", roles: ["ops"] });
    expect(await screen.findByText("OPS")).toBeInTheDocument();
  });

  test("merchant role / redirects to /merchant", async () => {
    await renderHomeRedirect({ id: 2, name: "Merchant", roles: ["merchant"] });
    expect(await screen.findByText("MERCHANT")).toBeInTheDocument();
  });

  test("admin role / redirects to /admin", async () => {
    await renderHomeRedirect({ id: 3, name: "Admin", roles: ["admin"] });
    expect(await screen.findByText("ADMIN")).toBeInTheDocument();
  });
});
