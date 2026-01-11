import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { defaultRouteForViewer } from "@/lib/defaultRoute";

/**
 * Role-aware landing redirect.
 *
 * Visiting `/` should send the viewer to the correct module root.
 */
export function HomeRedirect() {
  const { viewer } = useAuth();
  if (!viewer) return <Navigate to="/login" replace />;
  return <Navigate to={defaultRouteForViewer(viewer)} replace />;
}
