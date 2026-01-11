# ROADMAP_WEB.md — ops-dispatch-command-ui (React + Vite)

**North Star:** A role-aware web console that lets Ops/Admin/Merchant/Driver understand the business via **KPIs**, then act fast via **ops tools** (search, timeline, force actions), with enterprise UX and predictable structure.

---

## Web Principles (non-negotiables)
- Role-aware navigation + screens (Admin/Ops/Merchant/Driver).
- Every screen handles: loading, error, empty, unauthorized.
- Every privileged mutation has: confirm + required reason + pending disable + toast + correct cache invalidation.
- Feature-first structure: `src/features/<feature>/...` with `api.ts / types.ts / keys.ts / hooks.ts / pages/ / components/`.
- Do not introduce React Native/Expo. Web-only.

---

# Milestone A — Role-aware KPI Foundation (Dashboards first)

## A1) Auth + role-aware routing + layout
- [ ] Session bootstrap (current user + role) + protected routes
- [ ] Role-aware navigation (hide unauthorized items)
- [ ] Global error boundary + “Unauthorized/Forbidden” page

## A2) KPI UI system (reusable, scalable)
- [ ] KPI Card component (value, delta, trend, subtitle, tooltip, loading skeleton)
- [ ] KPI Grid layout + responsive behavior
- [ ] Range selector (Today / 7d / 30d / Custom if supported)
- [ ] “Last updated” + manual refresh + optional auto-refresh (off by default)
- [ ] Shared formatting utils (currency, percent, duration)

## A3) Merchant KPI Dashboard (primary)
- [x] Merchant KPI page: daily/weekly orders + revenue summary (API-based)
- [ ] KPI breakdown: AOV, cancel rate, fulfilled rate, prep-time avg (if API provides)
- [ ] KPI drilldowns: “View orders” link filtered by time range (if search endpoint exists)
- [ ] Tests: states + range toggle + caching/invalidation behavior

## A4) Ops KPI Dashboard
- [ ] Ops KPI page: orders today, active orders, stuck orders, avg assign time, active drivers online, late-risk count (if API provides)
- [ ] Drilldowns: stuck orders list, dispatch queue view, driver list (if endpoints exist)
- [ ] Tests: states + drilldown navigation

## A5) Admin KPI Dashboard
- [ ] Admin KPI page: GMV, net revenue, take rate, wallet mismatch count, refund totals, platform health rollup (if API provides)
- [ ] Tests: states + formatting + role gating

---

# Milestone B — Ops Console MVP (Act fast once KPIs show a problem)

## B1) Admin/Ops Order Search
- [ ] Search page with filters + pagination + deterministic ordering
- [ ] Row -> Order details (timeline screen)

## B2) Order Timeline (canonical)
- [ ] Timeline page: transitions, assignments, payments/ledger refs, notes/audit (as API returns)
- [ ] Copy actions for IDs + timestamps formatting
- [ ] Tests: deterministic ordering display + empty states

## B3) Force-cancel + Reassign driver
- [ ] Force-cancel modal: reason required + allowed-state guardrails + toast
- [ ] Reassign modal: driver_id required + confirm + toast + invalidates old assignment
- [ ] Tests: confirm flow + error handling + cache invalidation + role gating

---

# Milestone C — Dispatch Overrides + Driver Signals (Stability tools)

- [ ] Manual override: assign to specific driver
- [ ] Manual override: unassign/reset safely
- [ ] Show late-risk / heartbeat / offline-resume signals on relevant screens
- [ ] Tests: pending + success/failure toasts + role gating

---

# Milestone D — Production Readiness UI (Health + stuck detector)

- [ ] Health dashboard page (`/system/health`) with OK/WARN/CRIT rollups
- [ ] Stuck orders page with reason codes + drilldown to timeline + suggested actions
- [ ] Tests: states + refresh behavior

---

# Milestone E — Settlement & Wallet Operator Clarity

- [ ] Driver wallet page (driver role): balance + recent transactions
- [ ] Admin driver wallet page: admin view for driver wallet
- [ ] Merchant settlement page: earned/pending/paid + hold reasons + ETA
- [ ] Tests: states + formatting correctness (no float math in UI)

---

# Milestone F — Merchant Console (Operational controls)

- [ ] Store open/close + pause toggle
- [ ] Default prep time + per-order prep time override (if exposed)
- [ ] Tests: confirm dialogs + toasts + policy/role gating

---

# Milestone G — Public Storefront (Read-only)

- [ ] Shareable store link view: store + catalog snapshot
- [ ] Caching-friendly UX (stale while revalidate pattern if applicable)
- [ ] Tests: states + invalid store handling

---

# Release Gate (Web)
- [ ] Role-based KPI dashboards live (Merchant + Ops + Admin)
- [ ] Ops can search + view timeline + force-cancel + reassign without DB edits
- [ ] Health + stuck orders visible with drilldowns
- [ ] Wallet/settlement pages match API values and handle errors safely
