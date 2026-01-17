# ROADMAP_WEB.md — ops-dispatch-command-ui (React + Vite)

**North Star:** A role-aware web console that lets Ops/Admin/Merchant/Driver understand the business via **KPIs first**, then act fast via **ops tools** (search, timeline, force actions), with enterprise UX and predictable structure.

---

## Web Principles (non-negotiables)
- Role-aware navigation + screens (Admin/Ops/Merchant/Driver).
- Every screen handles: loading, error, empty, unauthorized/forbidden.
- Every privileged mutation has: confirm + required reason + pending disable + toast + correct cache invalidation.
- Feature-first structure: `src/features/<feature>/...` with `api.ts / types.ts / keys.ts / hooks.ts / pages/ / components/`.
- Web-only. Do not introduce React Native/Expo.
- API is source of truth: do not invent fields; types must match `api.json` or a provided sample response.

---

# Milestone 0 — Repo health to move fast (Web-only)
Goal: make development predictable, avoid blockers, keep scope safe.

- [x] Remove/disable legacy web test suites that reference deleted modules (only if blocking KPI work)
- [x] Typecheck baseline cleanup task (separate PR): fix the top offenders causing mass TS errors
- [x] Add "Known Issues" section to README (until baseline is green)
- [x] Production env config files + runtime verification log

---

# Milestone A — Role-aware foundation (required for every page)

## A1) Auth + role-aware routing + layout
- [x] Session bootstrap: current user + role(s) + guards
- [x] Protected routes + Forbidden/Unauthorized pages
- [x] Role-aware navigation (hide unauthorized items)
- [x] Global error boundary + safe fallback UI
- [x] Admin user role management page (`/admin/users`)

## A2) KPI UI system (reusable, scalable)
- [x] `KpiCard` (value, subtitle, optional delta/trend, tooltip, loading skeleton)
- [x] `KpiGrid` (responsive layout)
- [x] `KpiRangePicker` (Today / 7d / 30d) using `?range`
- [x] "Last updated" + manual refresh
- [x] Formatting utils (currency, counts, percent, duration)

---

# Milestone B — KPI Dashboards (role-based)

## B1) Merchant KPI Dashboard (primary)
API is ready → build the web.
- [x] Merchant KPI page using merchant KPI endpoints (API-driven, no client-side recompute)
- [x] Empty state: "No orders yet for this range"
- [x] Drilldown link: "View orders" filtered by range (if order search exists)
- [x] Role gating: merchant-only route `/merchant/kpi`

## B2) Ops KPI Dashboard (primary)
API exists but schema may be incomplete → proceed safely.
- [x] Ops KPI page `/ops/kpi`
- [x] Use API-driven fields only (no guessing). If `/ops/analytics/overview` schema is empty, use fallback endpoints or wait for schema patch.
- [x] Drilldowns: stuck orders list, driver list, dispatch funnel (as endpoints allow)
- [ ] Role gating: ops/admin only

## B3) Admin KPI Dashboard
 - [x] Admin KPI page `/admin/kpi`
- [x] Focus: platform health rollups + money/system indicators (wallet mismatches, refunds, etc.) based on API fields
- [ ] Role gating: admin only

---

# Milestone C — Ops Console MVP (actions after KPIs)

## C1) Order Search (Admin/Ops)
- [x] Search page with filters + pagination + deterministic ordering
- [x] Row → Order details (timeline screen)

## C2) Order Timeline (canonical)
- [x] Timeline page: transitions, assignments, payments/ledger refs, notes/audit (as API returns)
- [x] Copy-to-clipboard for IDs + consistent timestamp formatting

## C3) Force-cancel + Reassign driver (Admin/Ops)
- [x] Force-cancel modal: reason required + guardrails + toast
- [x] Reassign modal: driver_id required + confirm + toast + cache invalidation
- [x] Unassign driver: reason required + confirm + toast + cache refresh

---

## Milestone D — Stability tooling UI (health + stuck detector)

- [x] Health dashboard page (`/system/health`) with OK/WARN/CRIT rollups + DB/Redis/queue heartbeat
- [x] Health dashboard states: unauthorized, loading, error, empty
- [x] Stuck orders page (`/ops/orders/stuck`) with reason codes + drilldown to timeline + suggested actions
- [x] Optional: “AI explain stuck” button if endpoint is enabled (guarded)

---

# Milestone E — Settlement & Wallet operator clarity (money explainable)

- [x] Driver wallet page (driver role): balance + recent transactions
- [x] Admin driver wallet page: admin view for driver wallet
- [x] Merchant settlement page: earned/pending/paid + hold reasons + ETA
- [ ] Formatting: money as integer minor units (no float math in UI)

---

# Milestone F — Merchant console (operational controls)

- [x] Store open/close + pause toggle
- [x] Default prep time + per-order prep time override (if exposed)
- [x] Audit visibility (who changed what/when) where API provides it

---

# Milestone G — Public Storefront (read-only)

- [x] Shareable store link view: store + catalog snapshot
- [x] Caching-friendly UX (stale-while-revalidate pattern if applicable)
- [x] Invalid store handling

---

# Milestone H — Dispatch SaaS (multi-tenant)

- [x] Tenant-scoped auth headers for Dispatch SaaS requests
- [x] Dispatch workflow (create job, assignment, tracking, POD close)
- [x] Usage & billing summary page (finance-lite/fleet admin)
- [x] Role-aware gating for fleet admin/dispatcher/finance-lite
- [x] Policy + tenant error UX for Dispatch SaaS

---

# Release Gate (Web)
- [x] Role-based KPI dashboards live (Merchant + Ops + Admin)
- [x] Ops can search + view timeline + force-cancel + reassign without DB edits
- [x] Health + stuck orders visible with drilldowns
- [x] Wallet/settlement pages match API values and handle errors safely
