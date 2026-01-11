import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MerchantKpiResource } from "@/features/merchantKpi/types";
import { MerchantKpiPage } from "@/features/merchantKpi/pages/MerchantKpiPage";
import type { Role } from "@/lib/rbac";

const authState = {
  token: "test-token",
  viewer: { id: 1, name: "Merchant", roles: ["merchant"] as Role[] },
};

vi.mock("@/lib/auth", () => ({
  useAuth: () => authState,
}));

const fetchMerchantKpi = vi.fn();
vi.mock("@/features/merchantKpi/api", () => ({
  fetchMerchantKpi: (...args: unknown[]) => fetchMerchantKpi(...(args as Parameters<typeof fetchMerchantKpi>)),
}));

function renderPage(initialEntry = "/merchant/kpi") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <MerchantKpiPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const baseSnapshot = {
  start_date: "2025-01-01",
  end_date: "2025-01-01",
  orders_total: 15,
  orders_completed: 14,
  orders_cancelled: 1,
  completion_rate: 0.933,
  gross_revenue_cents: 125000,
  net_revenue_cents: 93500,
};

const weeklySnapshot = {
  start_date: "2024-12-26",
  end_date: "2025-01-01",
  orders_total: 88,
  orders_completed: 80,
  orders_cancelled: 8,
  completion_rate: 0.909,
  gross_revenue_cents: 725000,
  net_revenue_cents: 612000,
};

const sampleKpi: MerchantKpiResource = {
  store: { id: 1, name: "Test Cafe", slug: "test-cafe" },
  filters: { start_date: "2025-01-01", end_date: "2025-01-01", timezone: "Asia/Manila" },
  generated_at: "2025-01-01T05:00:00Z",
  daily: baseSnapshot,
  weekly: weeklySnapshot,
  buckets: { daily: [], weekly: [] },
};

const emptyKpi: MerchantKpiResource = {
  ...sampleKpi,
  daily: { ...baseSnapshot, orders_total: 0, orders_completed: 0, orders_cancelled: 0, gross_revenue_cents: 0, net_revenue_cents: 0 },
  weekly: { ...weeklySnapshot, orders_total: 0, orders_completed: 0, orders_cancelled: 0, gross_revenue_cents: 0, net_revenue_cents: 0 },
};

describe("MerchantKpiPage", () => {
  beforeEach(() => {
    fetchMerchantKpi.mockReset();
    authState.viewer.roles = ["merchant"];
  });

  it("renders loading skeleton state", () => {
    fetchMerchantKpi.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/Loading KPI data/i)).toBeInTheDocument();
  });

  it("shows error state and retries", async () => {
    fetchMerchantKpi.mockRejectedValueOnce(new Error("boom"));
    fetchMerchantKpi.mockResolvedValueOnce(sampleKpi);

    renderPage();

    expect(await screen.findByText(/Unable to load KPIs/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Try again/i));

    await waitFor(() => expect(screen.getByText("Orders total")).toBeInTheDocument());
    expect(fetchMerchantKpi).toHaveBeenCalledTimes(2);
  });

  it("renders empty state when no orders", async () => {
    fetchMerchantKpi.mockResolvedValue(emptyKpi);
    renderPage();
    expect(await screen.findByText(/No orders yet/i)).toBeInTheDocument();
  });

  it("renders KPI values on success", async () => {
    fetchMerchantKpi.mockResolvedValue(sampleKpi);
    renderPage();

    expect(await screen.findByText("Orders total")).toBeInTheDocument();
    expect(screen.getByText("₱1,250.00")).toBeInTheDocument();
    expect(screen.getByText("93.3%")) .toBeInTheDocument();
  });

  it("shows forbidden state for non-merchant viewers", () => {
    authState.viewer.roles = ["ops"];
    renderPage();
    expect(screen.getByText(/Access restricted/i)).toBeInTheDocument();
    expect(fetchMerchantKpi).not.toHaveBeenCalled();
  });
});
