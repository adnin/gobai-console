import type { Viewer } from "@/lib/rbac";

/**
 * Choose the best landing route for a signed-in user.
 *
 * Priority is intentionally deterministic:
 * - system -> /system
 * - admin  -> /admin
 * - ops    -> /ops
 * - merchant -> /merchant
 * - support  -> /support
 * - finance  -> /finance
 */
export function defaultRouteForViewer(viewer: Viewer | null | undefined): string {
  const roles = new Set((viewer?.roles ?? []).map((r) => String(r)));

  if (roles.has("system")) return "/system";
  if (roles.has("admin")) return "/admin";
  if (roles.has("ops")) return "/ops";
  if (roles.has("fleet_admin") || roles.has("dispatcher")) return "/partner/dispatch";
  if (roles.has("finance_lite")) return "/partner/usage";
  if (roles.has("partner_ops") || roles.has("partner")) return "/partner";
  if (roles.has("driver")) return "/driver/wallet";
  if (roles.has("merchant")) return "/merchant";
  if (roles.has("support")) return "/support";
  if (roles.has("finance")) return "/finance";
  // If the signed-in user has no console role yet (e.g., customer applying for partner),
  // send them to onboarding instead of a role-gated module.
  if ((viewer?.roles ?? []).length === 0) return "/partner/apply";

  // fallback
  return "/ops";
}
