import * as React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { hasAnyRole, type Role } from "@/lib/rbac";
import {
  LayoutGrid,
  LogOut,
  Shield,
  ShieldCheck,
  Store,
  Truck,
  Headset,
  Wallet,
  CreditCard,
  Settings,
  Activity,
  AlertTriangle,
  Sparkles,
  Users,
  Handshake,
  BarChart3,
} from "lucide-react";

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: Role[];
};

const NAV: NavItem[] = [
  { label: "Ops", to: "/ops", icon: <Truck className="size-4" />, roles: ["ops", "admin", "system"] },
  { label: "Ops KPI", to: "/ops/kpi", icon: <BarChart3 className="size-4" />, roles: ["ops", "admin", "system"] },
  { label: "Ops Diagnostics", to: "/ops/explain-stuck", icon: <Activity className="size-4" />, roles: ["ops", "admin", "system"] },
  { label: "Stuck Orders", to: "/ops/orders/stuck", icon: <AlertTriangle className="size-4" />, roles: ["ops", "admin", "system"] },
  { label: "Partner Dispatch", to: "/partner/dispatch", icon: <Truck className="size-4" />, roles: ["partner_ops", "partner", "admin", "system"] },
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
  { label: "Driver Wallets", to: "/admin/driver-wallets", icon: <CreditCard className="size-4" />, roles: ["admin", "system"] },
  { label: "Partner Applications", to: "/admin/partner-applications", icon: <Users className="size-4" />, roles: ["admin", "system"] },
  { label: "System", to: "/system", icon: <Settings className="size-4" />, roles: ["system"] },
  { label: "Compliance", to: "/system/compliance", icon: <ShieldCheck className="size-4" />, roles: ["system"] },
];

export function AppShell() {
  const { viewer, logout } = useAuth();
  const location = useLocation();

  const computeHideNav = React.useCallback(() => {
    // Dispatch consoles: full screen hides the left nav (default ON)
    if (location.pathname.startsWith("/ops/dispatch") || location.pathname.startsWith("/partner/dispatch")) {
      try {
        const v = window.localStorage.getItem("ops.command.fullScreen");
        return v ? v === "1" : true;
      } catch {
        return true;
      }
    }

    // Merchant board: allow the same “full screen / collapse nav” behavior (default OFF)
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

  React.useEffect(() => {
    const refresh = () => setHideNav(computeHideNav());
    refresh();
    // Custom events fired by UI toggles
    window.addEventListener("ops.command.fullScreen", refresh as any);
    window.addEventListener("merchant.command.fullScreen", refresh as any);
    // Cross-tab updates
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ops.command.fullScreen", refresh as any);
      window.removeEventListener("merchant.command.fullScreen", refresh as any);
      window.removeEventListener("storage", refresh);
    };
  }, [computeHideNav]);

  const items = React.useMemo(() => {
    return NAV.filter((x) => hasAnyRole(viewer, x.roles));
  }, [viewer]);

  const showOnboardingCallout = !!viewer && items.length === 0;

  return (
    <div className="h-full bg-background">
      <div className="flex h-full">
        <aside
          className={cn(
            "hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col",
            hideNav && "md:hidden"
          )}
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-4">
            <LayoutGrid className="size-5" />
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">Command UI</div>
              <div className="text-xs text-muted-foreground leading-tight">Role-based console</div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {items.length > 0 ? (
              <nav className="space-y-1">
                {items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent",
                        isActive ? "bg-accent font-medium" : "text-muted-foreground"
                      )
                    }
                  >
                    {it.icon}
                    <span className="truncate">{it.label}</span>
                  </NavLink>
                ))}
              </nav>
            ) : null}

            {showOnboardingCallout ? (
              <div className="mt-3 rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2">
                  <Handshake className="size-4 text-muted-foreground" />
                  <div className="text-sm font-semibold">Become a partner</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
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

          <div className="border-t border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{viewer?.name ?? "—"}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(viewer?.roles ?? []).map((r) => (
                    <Badge key={r} variant="secondary" className="text-[11px]">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="icon" onClick={() => void logout()} title="Logout">
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
