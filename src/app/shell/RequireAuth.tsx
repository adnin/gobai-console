import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

/**
 * Route guard that only requires a signed-in user (no role required).
 * Useful for onboarding pages where a user may not yet have an admin/ops/partner role.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { viewer } = useAuth();
  const loc = useLocation();

  if (!viewer) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  return <>{children}</>;
}
