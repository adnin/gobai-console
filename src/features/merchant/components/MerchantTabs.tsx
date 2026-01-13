import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { envBool } from "@/lib/http";

const tabs = [
  { to: "/merchant", label: "Orders" },
  { to: "/merchant/products", label: "Products" },
  { to: "/merchant/wallet", label: "Wallet" },
  { to: "/merchant/settlement", label: "Settlement" },
  { to: "/merchant/payouts", label: "Payouts" },
  { to: "/merchant/store", label: "Store" },
  { to: "/merchant/audit", label: "Audit" },
  { to: "/merchant/upgrade", label: "Upgrade" },
  { to: "/merchant/promotions", label: "Promotions" },
];

export function MerchantTabs() {
  const loc = useLocation();
  const path = loc.pathname;

  // Determine if the current viewer is an admin/system and whether promotions
  // should be visible to merchants based on an environment flag. When the
  // VITE_ENABLE_MERCHANT_PROMOS flag is false, hide the Promotions tab for
  // non-admin users. Admin and system users always see the tab.
  const { viewer } = useAuth();
  const isAdmin = Array.isArray(viewer?.roles) && (viewer.roles.includes("admin") || viewer.roles.includes("system"));
  const enablePromos = envBool("VITE_ENABLE_MERCHANT_PROMOS", false);
  const visibleTabs = tabs.filter((t) => {
    if (t.to !== "/merchant/promotions") return true;
    return isAdmin || enablePromos;
  });

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {visibleTabs.map((t) => {
        const active = path === t.to || (t.to !== "/merchant" && path.startsWith(t.to));
        return (
          <Link
            key={t.to}
            to={t.to}
            className={
              "rounded-full border px-3 py-1 text-sm transition " +
              (active
                ? "border-foreground/30 bg-foreground/5 font-semibold"
                : "border-border bg-background hover:bg-muted/30")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
