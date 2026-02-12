import * as React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { hasAnyRole, type Role } from "@/lib/rbac";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellDot,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Database,
  Handshake,
  Headset,
  LayoutGrid,
  LogOut,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: Role[];
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = "console.sidebar.collapsed";

const NAV: NavItem[] = [
  { label: "Ops", to: "/ops", icon: <Truck className="size-4" />, roles: ["ops", "admin", "system"] },
  { label: "Ops KPI", to: "/ops/kpi", icon: <BarChart3 className="size-4" />, roles: ["ops", "admin", "system"] },
  { label: "Ops Diagnostics", to: "/ops/explain-stuck", icon: <Activity className="size-4" />, roles: ["ops", "admin", "system"] },
  { label: "Stuck Orders", to: "/ops/orders/stuck", icon: <AlertTriangle className="size-4" />, roles: ["ops", "admin", "system"] },
  {
    label: "Partner Dispatch",
    to: "/partner/dispatch",
    icon: <Truck className="size-4" />,
    roles: ["partner_ops", "partner", "fleet_admin", "dispatcher", "admin", "system"],
  },
  { label: "Usage", to: "/partner/usage", icon: <BarChart3 className="size-4" />, roles: ["fleet_admin", "finance_lite", "admin", "system"] },
  { label: "Partner", to: "/partner", icon: <Handshake className="size-4" />, roles: ["partner_ops", "partner", "admin", "system"] },
  { label: "Driver Wallet", to: "/driver/wallet", icon: <Wallet className="size-4" />, roles: ["driver", "admin", "system"] },
  { label: "Merchant", to: "/merchant", icon: <Store className="size-4" />, roles: ["merchant", "admin", "system"] },
  { label: "Merchant AI", to: "/merchant/ai", icon: <Sparkles className="size-4" />, roles: ["merchant", "admin", "system"] },
  { label: "Merchant KPI", to: "/merchant/kpi", icon: <BarChart3 className="size-4" />, roles: ["merchant", "admin", "system"] },
  { label: "Support", to: "/support", icon: <Headset className="size-4" />, roles: ["support", "admin", "system"] },
  { label: "Finance", to: "/finance", icon: <Wallet className="size-4" />, roles: ["finance", "admin", "system"] },
  { label: "Orders", to: "/admin/orders", icon: <Truck className="size-4" />, roles: ["admin", "ops", "system"] },
  { label: "Admin KPI", to: "/admin/kpi", icon: <BarChart3 className="size-4" />, roles: ["admin", "system"] },
  { label: "Admin", to: "/admin", icon: <Shield className="size-4" />, roles: ["admin", "system"] },
  { label: "Places Import", to: "/admin/places/import", icon: <Database className="size-4" />, roles: ["admin", "system"] },
  { label: "Admin Users", to: "/admin/users", icon: <Users className="size-4" />, roles: ["admin", "system"] },
  { label: "Driver Wallets", to: "/admin/driver-wallets", icon: <CreditCard className="size-4" />, roles: ["admin", "system"] },
  { label: "Partner Applications", to: "/admin/partner-applications", icon: <Users className="size-4" />, roles: ["admin", "system"] },
  { label: "System", to: "/system", icon: <Settings className="size-4" />, roles: ["system"] },
  { label: "Compliance", to: "/system/compliance", icon: <ShieldCheck className="size-4" />, roles: ["system"] },
];

export function AppShell() {
  const { viewer, logout } = useAuth();
  const location = useLocation();

  const computeHideNav = React.useCallback(() => {
    // Dispatch consoles: full screen hides the left nav (default ON).
    if (location.pathname.startsWith("/ops/dispatch") || location.pathname.startsWith("/partner/dispatch")) {
      try {
        const v = window.localStorage.getItem("ops.command.fullScreen");
        return v ? v === "1" : true;
      } catch {
        return true;
      }
    }

    // Merchant board: same full-screen behavior (default OFF).
    if (location.pathname.startsWith("/merchant")) {
      try {
        const v = window.localStorage.getItem("merchant.command.fullScreen");
        return v ? v === "1" : false;
      } catch {
        return false;
      }
    }

    return false;
  }, [location.pathname]);

  const [hideNav, setHideNav] = React.useState<boolean>(() => computeHideNav());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    const refresh = () => setHideNav(computeHideNav());
    refresh();
    window.addEventListener("ops.command.fullScreen", refresh as EventListener);
    window.addEventListener("merchant.command.fullScreen", refresh as EventListener);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ops.command.fullScreen", refresh as EventListener);
      window.removeEventListener("merchant.command.fullScreen", refresh as EventListener);
      window.removeEventListener("storage", refresh);
    };
  }, [computeHideNav]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, isSidebarCollapsed ? "1" : "0");
    } catch {
      // ignore write failures (private mode / blocked storage)
    }
  }, [isSidebarCollapsed]);

  const items = React.useMemo(() => {
    return NAV.filter((x) => hasAnyRole(viewer, x.roles));
  }, [viewer]);

  const showOnboardingCallout = !!viewer && items.length === 0;
  const viewerName = viewer?.name?.trim() || "Operator";
  const viewerInitial = viewerName.charAt(0).toUpperCase() || "O";

  return (
    <div className="h-full bg-background text-foreground">
      <div className="flex h-full min-h-0 flex-col">
        {!hideNav ? (
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <LayoutGrid className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold leading-tight">GOBAI Console</div>
                  <div className="truncate text-xs leading-tight text-muted-foreground">Control center</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden text-muted-foreground md:inline-flex"
                  onClick={() => setIsSidebarCollapsed((value) => !value)}
                  title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {isSidebarCollapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-full bg-[#d7f3eb] px-4 py-2 text-xs font-semibold text-[#16614f] md:inline-flex"
                >
                  <BellDot className="size-4" />
                  Unread notifications
                </button>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card py-1 pl-1 pr-3 shadow-sm">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-[#ebf5ec] text-xs font-semibold text-[#2f7d3a]">
                    {viewerInitial}
                  </span>
                  <span className="max-w-[140px] truncate text-sm font-medium">{viewerName}</span>
                </div>
              </div>
            </div>
          </header>
        ) : null}

        <div className="flex min-h-0 flex-1">
          <aside
            className={cn(
              "hidden shrink-0 border-r border-border bg-[#e8edf3] transition-[width] duration-200 md:flex md:flex-col",
              isSidebarCollapsed ? "w-[84px]" : "w-[280px]",
              hideNav && "md:hidden"
            )}
          >
            <div className="border-b border-border p-3">
              <button
                type="button"
                className={cn(
                  "flex h-11 w-full items-center rounded-full border border-border bg-[#eef2f6] text-sm text-[#374151]",
                  isSidebarCollapsed ? "justify-center px-0" : "px-4 text-left"
                )}
                title="All modules"
              >
                {isSidebarCollapsed ? <LayoutGrid className="size-4" /> : "All modules"}
              </button>
            </div>

            <div className="flex-1 overflow-auto p-3">
              {items.length > 0 ? (
                <nav className="space-y-1.5">
                  {items.map((it) => (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      title={it.label}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center rounded-xl border border-transparent py-2.5 text-sm transition-colors",
                          isSidebarCollapsed ? "justify-center px-2" : "gap-2 px-3",
                          isActive
                            ? "border-[#b9e4d7] bg-[#dcf3ea] font-medium text-[#16614f]"
                            : "text-[#4b5563] hover:bg-white/80"
                        )
                      }
                    >
                      {it.icon}
                      {!isSidebarCollapsed ? <span className="truncate">{it.label}</span> : null}
                    </NavLink>
                  ))}
                </nav>
              ) : null}

              {showOnboardingCallout ? (
                <div className="mt-3 rounded-xl border border-[#b9e4d7] bg-[#dcf3ea] p-3">
                  <div className="flex items-center gap-2">
                    <Handshake className="size-4 text-[#16614f]" />
                    <div className="text-sm font-semibold">Become a partner</div>
                  </div>
                  <div className="mt-1 text-xs text-[#435365]">
                    Apply to manage your own drivers and earn commission per completed order.
                  </div>
                  <a
                    href="/partner/apply"
                    className={cn(buttonVariants({ variant: "default" }), "mt-3 w-full")}
                  >
                    Apply as Partner
                  </a>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border bg-card/70 p-3">
              <div className={cn("flex gap-2", isSidebarCollapsed ? "flex-col items-center" : "items-center justify-between")}>
                <div className={cn("min-w-0", isSidebarCollapsed && "w-full")}>
                  {!isSidebarCollapsed ? <div className="truncate text-sm font-semibold">{viewer?.name ?? "-"}</div> : null}
                  {!isSidebarCollapsed ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(viewer?.roles ?? []).map((r) => (
                        <Badge key={r} variant="secondary" className="text-[11px]">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-[#ebf5ec] text-xs font-semibold text-[#2f7d3a]">
                        {viewerInitial}
                      </span>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="icon" onClick={() => void logout()} title="Logout" aria-label="Logout">
                  <LogOut className="size-4" />
                </Button>
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
