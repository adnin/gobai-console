import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { requireAnyRole, type Role } from "@/lib/rbac";

export function RequireRoles({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { viewer } = useAuth();
  const loc = useLocation();

  if (!viewer) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  if (!requireAnyRole(viewer, roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
