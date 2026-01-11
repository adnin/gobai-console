import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/shell/AppShell";
import { RequireRoles } from "@/app/shell/RequireRoles";
import { RequireAuth } from "@/app/shell/RequireAuth";
import { LoginPage } from "@/app/pages/LoginPage";
import { UnauthorizedPage } from "@/app/pages/UnauthorizedPage";
import LogoutPage from "@/app/pages/LogoutPage";

import { CommandCenterPage } from "@/features/dispatch/pages/CommandCenterPage";
import PartnerDispatchPage from "@/features/dispatch/pages/PartnerDispatchPage";
import { PartnerApplyPage } from "@/features/partner/pages/PartnerApplyPage";
import { PartnerHomePage } from "@/features/partner/pages/PartnerHomePage";
import { MerchantHomePage } from "@/features/merchant/pages/MerchantHomePage";
import MerchantUpgradePage from "@/features/merchant/pages/MerchantUpgradePage";
import { MerchantProductsPage } from "@/features/merchant/pages/MerchantProductsPage";
import { MerchantWalletPage } from "@/features/merchant/pages/MerchantWalletPage";
import { MerchantPayoutsPage } from "@/features/merchant/pages/MerchantPayoutsPage";
import { MerchantStorePage } from "@/features/merchant/pages/MerchantStorePage";
import { MerchantAuditPage } from "@/features/merchant/pages/MerchantAuditPage";
import { AdminHomePage } from "@/features/admin/pages/AdminHomePage";
import { MerchantKpiPage } from "@/features/merchantKpi/pages/MerchantKpiPage";
import { OpsKpiPage } from "@/features/opsKpi/pages/OpsKpiPage";
import { AdminKpiPage } from "@/features/adminKpi/pages/AdminKpiPage";
import { AdminPartnerApplicationsPage } from "@/features/admin/pages/AdminPartnerApplicationsPage";
import AdminPartnerDetailPage from "@/features/admin/pages/AdminPartnerDetailPage";
import { AdminMerchantsPage } from "@/features/admin/pages/AdminMerchantsPage";
import { AdminDriversPage } from "@/features/admin/pages/AdminDriversPage";
import { AdminCashinsPage } from "@/features/admin/pages/AdminCashinsPage";
import { AdminCashoutsPage } from "@/features/admin/pages/AdminCashoutsPage";
import { AdminReceiptsPage } from "@/features/admin/pages/AdminReceiptsPage";
import { AdminOrderPaymentPage } from "@/features/admin/pages/AdminOrderPaymentPage";
import { SupportHomePage } from "@/features/support/pages/SupportHomePage";
import { SupportDisputesPage } from "@/features/support/pages/SupportDisputesPage";
import { SupportDisputeDetailPage } from "@/features/support/pages/SupportDisputeDetailPage";
import { SupportOrdersPage } from "@/features/support/pages/SupportOrdersPage";
import { SupportUsersPage } from "@/features/support/pages/SupportUsersPage";
import { SupportUserDetailPage } from "@/features/support/pages/SupportUserDetailPage";
import { SupportAiAssistPage } from "@/features/support/pages/SupportAiAssistPage";
import { SupportKbPage } from "@/features/support/pages/SupportKbPage";
import { SupportTicketsPage } from "@/features/support/pages/SupportTicketsPage";
import { FinanceHomePage } from "@/features/finance/pages/FinanceHomePage";
import { FinanceWalletsPage } from "@/features/finance/pages/FinanceWalletsPage";
import { FinanceReconcilePage } from "@/features/finance/pages/FinanceReconcilePage";
import { FinanceReconcileReportPage } from "@/features/finance/pages/FinanceReconcileReportPage";
import { SystemHomePage } from "@/features/system/pages/SystemHomePage";
import { SystemCompliancePage } from "@/features/system/pages/SystemCompliancePage";
// Promotions modules (merchant/admin/finance/partner)
import MerchantPromotionsPage from "@/features/merchant/pages/MerchantPromotionsPage";
import AdminPromotionsPage from "@/features/admin/pages/AdminPromotionsPage";
import FinancePromotionsPage from "@/features/finance/pages/FinancePromotionsPage";
import PartnerPromotionsPage from "@/features/partner/pages/PartnerPromotionsPage";
import { MerchantAiGeneratePage } from "@/features/merchant/pages/MerchantAiGeneratePage";
import { OpsExplainStuckPage } from "@/features/dispatch/pages/OpsExplainStuckPage";
// Import envBool for conditional promotion module access
import { envBool } from "@/lib/http";
import { HomeRedirect } from "@/app/HomeRedirect";
import type { Role } from "@/lib/rbac";

export function AppRouter() {
  // Determine promotion module visibility for non-admin users. By default these
  // modules are only accessible to admin/system. Environment variables allow
  // enabling access for other roles on a per-module basis. Admin and system
  // roles always retain access regardless of these flags.
  const ENABLE_MERCHANT_PROMOS = envBool("VITE_ENABLE_MERCHANT_PROMOS", false);
  const ENABLE_PARTNER_PROMOS = envBool("VITE_ENABLE_PARTNER_PROMOS", false);
  const ENABLE_FINANCE_PROMOS = envBool("VITE_ENABLE_FINANCE_PROMOS", false);

  // Compute roles allowed for each promotions route. When the corresponding
  // feature flag is disabled, only admin and system may access the route.
  const merchantPromoRoles: Role[] = ENABLE_MERCHANT_PROMOS
    ? ["merchant", "admin", "system"]
    : ["admin", "system"];
  const partnerPromoRoles: Role[] = ENABLE_PARTNER_PROMOS
    ? ["partner_ops", "partner", "admin", "system"]
    : ["admin", "system"];
  const financePromoRoles: Role[] = ENABLE_FINANCE_PROMOS
    ? ["finance", "admin", "system"]
    : ["admin", "system"];
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/logout" element={<LogoutPage />} />

        {/* App Shell */}
        <Route path="/" element={<AppShell />}>

          <Route
            path="ops/kpi"
            element={
              <RequireRoles roles={[("ops" satisfies Role), "admin", "system"]}>
                <OpsKpiPage />
              </RequireRoles>
            }
          />
          <Route index element={<HomeRedirect />} />

          {/* Onboarding (auth-only, no role) */}
          <Route
            path="partner/apply"
            element={
              <RequireAuth>
                <PartnerApplyPage />
              </RequireAuth>
            }
          />

          {/* Ops */}
          <Route
            path="ops"
            element={
              <RequireRoles roles={["ops", "admin", "system"]}>
                <Navigate to="/ops/dispatch" replace />
              </RequireRoles>
            }
          />
          <Route
            path="ops/dispatch"
            element={
              <RequireRoles roles={["ops", "admin", "system"]}>
                <CommandCenterPage />
              </RequireRoles>
            }
          />

          <Route
            path="ops/explain-stuck"
            element={
              <RequireRoles roles={["ops", "admin", "system"]}>
                <OpsExplainStuckPage />
              </RequireRoles>
            }
          />

          <Route
            path="ops/logout"
            element={
              <RequireRoles roles={["ops", "admin", "system"]}>
                <LogoutPage />
              </RequireRoles>
            }
          />

          {/* Partner */}
          <Route
            path="partner"
            element={
              <RequireRoles roles={["partner_ops", "partner", "admin", "system"]}>
                <PartnerHomePage />
              </RequireRoles>
            }
          />

          <Route
            path="partner/dispatch"
            element={
              <RequireRoles roles={["partner_ops", "partner", "admin", "system"]}>
                <PartnerDispatchPage />
              </RequireRoles>
            }
          />

          <Route
            path="partner/promotions"
            element={
              <RequireRoles roles={partnerPromoRoles}>
                <PartnerPromotionsPage />
              </RequireRoles>
            }
          />

          <Route
            path="partner/logout"
            element={
              <RequireRoles roles={["partner_ops", "partner", "admin", "system"]}>
                <LogoutPage />
              </RequireRoles>
            }
          />

          {/* Merchant */}
          <Route
            path="merchant"
            element={
              <RequireRoles roles={["merchant", "admin", "system"]}>
                <MerchantHomePage />
              </RequireRoles>
            }
          />

          <Route
            path="merchant/ai"
            element={
              <RequireRoles roles={["merchant", "admin", "system"]}>
                <MerchantAiGeneratePage />
              </RequireRoles>
            }
          />

          <Route
            path="merchant/kpi"
            element={
              <RequireRoles roles={["merchant", "admin", "system"]}>
                <MerchantKpiPage />
              </RequireRoles>
            }
          />

          <Route
            path="merchant/products"
            element={
              <RequireRoles roles={["merchant", "admin", "system"]}>
                <MerchantProductsPage />
              </RequireRoles>
            }
          />

          <Route
            path="merchant/wallet"
            element={
              <RequireRoles roles={["merchant", "admin", "system"]}>
                <MerchantWalletPage />
              </RequireRoles>
            }
          />

          <Route
            path="merchant/payouts"
            element={
              <RequireRoles roles={["merchant", "admin", "system"]}>
                <MerchantPayoutsPage />
              </RequireRoles>
            }
          />

          <Route
            path="merchant/store"
            element={
              <RequireRoles roles={["merchant", "admin", "system"]}>
                <MerchantStorePage />
              </RequireRoles>
            }
          />

          <Route
            path="merchant/audit"
            element={
              <RequireRoles roles={["merchant", "admin", "system"]}>
                <MerchantAuditPage />
              </RequireRoles>
            }
          />

          <Route
            path="merchant/upgrade"
            element={
              <RequireRoles roles={["merchant", "admin", "system"]}>
                <MerchantUpgradePage />
              </RequireRoles>
            }
          />

          <Route
            path="merchant/promotions"
            element={
              <RequireRoles roles={merchantPromoRoles}>
                <MerchantPromotionsPage />
              </RequireRoles>
            }
          />

          <Route
            path="merchant/logout"
            element={
              <RequireRoles roles={["merchant", "admin", "system"]}>
                <LogoutPage />
              </RequireRoles>
            }
          />

          {/* Support */}
          <Route
            path="support"
            element={
              <RequireRoles roles={["support", "admin", "system"]}>
                <SupportHomePage />
              </RequireRoles>
            }
          />

          <Route
            path="support/kb"
            element={
              <RequireRoles roles={["support", "admin", "system"]}>
                <SupportKbPage />
              </RequireRoles>
            }
          />

          <Route
            path="support/tickets"
            element={
              <RequireRoles roles={["support", "admin", "system"]}>
                <SupportTicketsPage />
              </RequireRoles>
            }
          />

          <Route
            path="support/disputes"
            element={
              <RequireRoles roles={["support", "admin", "system"]}>
                <SupportDisputesPage />
              </RequireRoles>
            }
          />

          <Route
            path="support/disputes/:disputeId"
            element={
              <RequireRoles roles={["support", "admin", "system"]}>
                <SupportDisputeDetailPage />
              </RequireRoles>
            }
          />

          <Route
            path="support/orders"
            element={
              <RequireRoles roles={["support", "admin", "system"]}>
                <SupportOrdersPage />
              </RequireRoles>
            }
          />

          <Route
            path="support/ai"
            element={
              <RequireRoles roles={["support", "admin", "system"]}>
                <SupportAiAssistPage />
              </RequireRoles>
            }
          />

          <Route
            path="support/users"
            element={
              <RequireRoles roles={["support", "admin", "system"]}>
                <SupportUsersPage />
              </RequireRoles>
            }
          />

          <Route
            path="support/users/:userId"
            element={
              <RequireRoles roles={["support", "admin", "system"]}>
                <SupportUserDetailPage />
              </RequireRoles>
            }
          />

          {/* Finance */}
          <Route
            path="finance"
            element={
              <RequireRoles roles={["finance", "admin", "system"]}>
                <FinanceHomePage />
              </RequireRoles>
            }
          />

          <Route
            path="finance/wallets"
            element={
              <RequireRoles roles={["finance", "admin", "system"]}>
                <FinanceWalletsPage />
              </RequireRoles>
            }
          />

          <Route
            path="finance/promotions"
            element={
              <RequireRoles roles={financePromoRoles}>
                <FinancePromotionsPage />
              </RequireRoles>
            }
          />

          <Route
            path="finance/reconcile"
            element={
              <RequireRoles roles={["finance", "admin", "system"]}>
                <FinanceReconcilePage />
              </RequireRoles>
            }
          />

          <Route
            path="finance/reconcile/reports/:reportId"
            element={
              <RequireRoles roles={["finance", "admin", "system"]}>
                <FinanceReconcileReportPage />
              </RequireRoles>
            }
          />

          {/* Admin */}
          <Route
            path="admin"
            element={
              <RequireRoles roles={["admin", "system"]}>
                <AdminHomePage />
              </RequireRoles>
            }
          />

          <Route
            path="admin/kpi"
            element={
              <RequireRoles roles={["admin", "system"]}>
                <AdminKpiPage />
              </RequireRoles>
            }
          />

          <Route
            path="admin/merchants"
            element={
              <RequireRoles roles={["admin", "system"]}>
                <AdminMerchantsPage />
              </RequireRoles>
            }
          />

          <Route
            path="admin/drivers"
            element={
              <RequireRoles roles={["admin", "system"]}>
                <AdminDriversPage />
              </RequireRoles>
            }
          />

          <Route
            path="admin/cashins"
            element={
              <RequireRoles roles={["admin", "system"]}>
                <AdminCashinsPage />
              </RequireRoles>
            }
          />

          <Route
            path="admin/cashouts"
            element={
              <RequireRoles roles={["admin", "system"]}>
                <AdminCashoutsPage />
              </RequireRoles>
            }
          />

          <Route
            path="admin/promotions"
            element={
              <RequireRoles roles={["admin", "system"]}>
                <AdminPromotionsPage />
              </RequireRoles>
            }
          />

          <Route
            path="admin/receipts"
            element={
              <RequireRoles roles={["admin", "system"]}>
                <AdminReceiptsPage />
              </RequireRoles>
            }
          />

          <Route
            path="admin/orders/payment"
            element={
              <RequireRoles roles={["admin", "system"]}>
                <AdminOrderPaymentPage />
              </RequireRoles>
            }
          />

          <Route
            path="admin/partner-applications"
            element={
              <RequireRoles roles={["admin", "system"]}>
                <AdminPartnerApplicationsPage />
              </RequireRoles>
            }
          />

          <Route
            path="admin/partners/:partnerUserId"
            element={
              <RequireRoles roles={["admin", "system"]}>
                <AdminPartnerDetailPage />
              </RequireRoles>
            }
          />

          {/* System */}
          <Route
            path="system"
            element={
              <RequireRoles roles={["system"]}>
                <SystemHomePage />
              </RequireRoles>
            }
          />

          <Route
            path="system/compliance"
            element={
              <RequireRoles roles={["system"]}>
                <SystemCompliancePage />
              </RequireRoles>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="text-lg font-semibold">Not Found</div>
        <div className="mt-1 text-sm text-muted-foreground">That page does not exist.</div>
        <a className="mt-4 inline-block text-sm underline" href="/">
          Go to Home
        </a>
      </div>
    </div>
  );
}

