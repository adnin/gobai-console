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

- [ ] Remove/disable legacy web test suites that reference deleted modules (only if blocking KPI work)
- [ ] Typecheck baseline cleanup task (separate PR): fix the top offenders causing mass TS errors
- [ ] Add “Known Issues” section to README (until baseline is green)

---

# Milestone A — Role-aware foundation (required for every page)

## A1) Auth + role-aware routing + layout
- [ ] Session bootstrap: current user + role(s) + guards
- [ ] Protected routes + Forbidden/Unauthorized pages
- [ ] Role-aware navigation (hide unauthorized items)
- [ ] Global error boundary + safe fallback UI

## A2) KPI UI system (reusable, scalable)
- [ ] `KpiCard` (value, subtitle, optional delta/trend, tooltip, loading skeleton)
- [ ] `KpiGrid` (responsive layout)
- [ ] `KpiRangePicker` (Today / 7d / 30d) using `?range=`
- [ ] “Last updated” + manual refresh
- [ ] Formatting utils (currency, counts, percent, duration)

---

# Milestone B — KPI Dashboards (role-based)

## B1) Merchant KPI Dashboard (primary)
API is ready → build the web.
- [ ] Merchant KPI page using merchant KPI endpoints (API-driven, no client-side recompute)
- [ ] Empty state: “No orders yet for this range”
- [ ] Drilldown link: “View orders” filtered by range (if order search exists)
- [ ] Role gating: merchant-only route `/merchant/kpi`

## B2) Ops KPI Dashboard (primary)
API exists but schema may be incomplete → proceed safely.
- [x] Ops KPI page `/ops/kpi`
- [ ] Use API-driven fields only (no guessing). If `/ops/analytics/overview` schema is empty, use fallback endpoints or wait for schema patch.
- [ ] Drilldowns: stuck orders list, driver list, dispatch funnel (as endpoints allow)
- [ ] Role gating: ops/admin only

## B3) Admin KPI Dashboard
- [ ] Admin KPI page `/admin/kpi`
- [ ] Focus: platform health rollups + money/system indicators (wallet mismatches, refunds, etc.) based on API fields
- [ ] Role gating: admin only

---

# Milestone C — Ops Console MVP (actions after KPIs)

## C1) Order Search (Admin/Ops)
- [ ] Search page with filters + pagination + deterministic ordering
- [ ] Row → Order details (timeline screen)

## C2) Order Timeline (canonical)
- [ ] Timeline page: transitions, assignments, payments/ledger refs, notes/audit (as API returns)
- [ ] Copy-to-clipboard for IDs + consistent timestamp formatting

## C3) Force-cancel + Reassign driver (Admin/Ops)
- [ ] Force-cancel modal: reason required + guardrails + toast
- [ ] Reassign modal: driver_id required + confirm + toast + cache invalidation

---

# Milestone D — Stability tooling UI (health + stuck detector)

- [ ] Health dashboard page (`/system/health`) with OK/WARN/CRIT rollups
- [ ] Stuck orders page (`/ops/orders/stuck`) with reason codes + drilldown to timeline + suggested actions
- [ ] Optional: “AI explain stuck” button if endpoint is enabled (guarded)

---

# Milestone E — Settlement & Wallet operator clarity (money explainable)

- [ ] Driver wallet page (driver role): balance + recent transactions
- [ ] Admin driver wallet page: admin view for driver wallet
- [ ] Merchant settlement page: earned/pending/paid + hold reasons + ETA
- [ ] Formatting: money as integer minor units (no float math in UI)

---

# Milestone F — Merchant console (operational controls)

- [ ] Store open/close + pause toggle
- [ ] Default prep time + per-order prep time override (if exposed)
- [ ] Audit visibility (who changed what/when) where API provides it

---

# Milestone G — Public Storefront (read-only)

- [ ] Shareable store link view: store + catalog snapshot
- [ ] Caching-friendly UX (stale-while-revalidate pattern if applicable)
- [ ] Invalid store handling

---

# Release Gate (Web)
- [ ] Role-based KPI dashboards live (Merchant + Ops + Admin)
- [ ] Ops can search + view timeline + force-cancel + reassign without DB edits
- [ ] Health + stuck orders visible with drilldowns
- [ ] Wallet/settlement pages match API values and handle errors safely
