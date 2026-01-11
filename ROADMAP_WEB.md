---
## Continuous loop workflow (for Codex/agent)
1) Read `NEXT_UP.md`
2) Create a branch `chore/<slug>` / `feat/<slug>` / `test/<slug>`
3) Implement the **smallest safe change** (no breaking routes, keep API contracts)
4) Add/update tests if needed
5) Run:
   - `yarn test`
   - `yarn typecheck`
   - `yarn build`
   - (optional if configured) `yarn lint`
6) If green: mark checkbox(es) in this file
7) Replace `NEXT_UP.md` with exactly **ONE** next task
---

# Web Roadmap — Ops/Dispatch + Merchant + Admin (React + Vite)

**App:** `ops-dispatch-command-ui`  
**Goal:** make the web “ops-grade”: fast triage, clear money, role-safe, testable.

## Roles (who uses what)
- **admin:** global configuration, approvals, override actions, audit
- **ops:** dispatch + stuck orders + live monitoring
- **merchant:** store setup, catalog, orders, wallet/settlement, payouts
- **support:** disputes/tickets, refunds escalation, customer/merchant comms notes
- **finance:** settlement releases, payout batches, reconcile views, ledger drill-down

> Rule of thumb: **every privileged action must show “who/when/why”** and link to timeline/audit.

---

# Sprint 1 — Foundation Lock‑in (Reliability + DevEx)

**Goal:** no fires, boring reliability, new dev can run it fast.

## Core architecture & reliability
- [ ] Role-based routing is enforced everywhere (no “hidden links only” access)
  - [ ] `RequireAuth` blocks unauthenticated access
  - [ ] `RequireRoles` blocks unauthorized access (admin/ops/merchant/support/finance)
  - [x] Role-aware navigation + landing redirects (`/` -> module root; `/ops` landing route)
- [ ] API client standards (single place)
  - [ ] Base URL/env handling (dev/stage/prod)
  - [ ] Attach auth token + `rid` correlation id header on every request
  - [ ] Normalize API errors (show user-safe message, keep debug details in console/log)
- [ ] Query/mutation conventions (TanStack Query)
  - [ ] Standard keys + invalidation rules per feature
  - [ ] Retry policy + offline friendly behavior for ops screens
- [ ] UI states are non-negotiable
  - [ ] Loading (skeletons), empty, error, and “no permission” states for all pages
- [ ] Design system baseline
  - [ ] Button/Input/Table/Modal/Toast patterns are unified (single source in `/src/ui`)
  - [ ] Accessibility basics: focus states, keyboard nav, aria-labels for controls

## Testing baseline (web-verifiable)
- [ ] Vitest: unit tests for critical utilities (rbac, api error mapping, money formatting)
- [ ] MSW or equivalent for integration tests (feature flows without real backend)
- [ ] Smoke tests: app boots, login route, unauthorized route, role guard works

## Sprint 1 Exit criteria (web-verifiable)
- [ ] A new dev can run: `yarn && yarn dev` and can login to see role-scoped navigation.
- [ ] Every route is protected by auth + roles (no direct URL access for wrong role).
- [ ] Global error handling works (401→login, 403→unauthorized, 5xx→toast + retry).

---

# Sprint 1.5 — Launch Week Hardening (Ops Console “Before Public”)

**Goal:** ops can resolve issues fast without guessing.

## Ops console MVP (ops/admin)
- [ ] **Order search**
  - [ ] Filters: order id, customer phone/email, driver, store, status, date range
  - [ ] Pagination + deterministic sorting
- [ ] **Order timeline view**
  - [ ] Shows transitions, assignments, payments/ledger refs, notes
  - [ ] Copyable `rid` + “share timeline link” behavior
- [ ] **Fix actions (admin/ops with audit)**
  - [ ] Force-cancel (requires reason, shows allowed states)
  - [ ] Reassign driver (shows eligibility, warns about invalidation)
  - [ ] Unassign/reset safely (if supported)
- [ ] **Stuck order dashboard**
  - [ ] Reason codes + “recommended action” hints
  - [ ] One-click jump to order timeline

## Dispatch stability (ops)
- [ ] Command Center realtime polish
  - [ ] Driver online/busy/offline indicators
  - [ ] Accept timeout and retry visibility (what happened, when)
  - [ ] Live updates via socket (fallback to polling)
- [ ] Manual override UI is safe
  - [ ] Confirm dialogs + “this will do X” summaries
  - [ ] Post-action toast includes audit reference id (if backend provides)

## Promo run dashboard (admin)
- [ ] Dry-run vs execute mode + guardrail warnings
- [ ] Rollback view (if available) + audit entries visible

## Sprint 1.5 Exit criteria (web-verifiable)
- [ ] Ops can: find any order → open timeline → take a corrective action → see audit result.
- [ ] Stuck orders are visible with reason codes and link to timeline.
- [ ] Realtime dispatch screen remains usable under intermittent connectivity.

---

# Sprint 2 — Merchant MVP (Retention + Clarity)

**Goal:** merchants feel “this is my business,” not “chat ops.”

## Merchant foundations (merchant role)
- [ ] Store setup
  - [ ] Store profile + open/close + pause toggle
  - [ ] Prep time defaults + per-order override UI (with constraints)
  - [ ] Service area + minimum order controls (simple v1 UI)
  - [ ] Holiday/special schedule overrides (if enabled in API)
- [ ] Catalog management
  - [ ] Categories/collections, product availability, price edits
  - [ ] Bulk actions (enable/disable, set stock, price adjustments)
- [ ] Orders screen
  - [ ] Accept/reject with timers + clear state transitions
  - [ ] Partner mode: “own rider” dispatch workflow + POD handling
- [ ] Settlement & wallet clarity
  - [ ] Earned/pending/paid totals + hold reasons + ETA labels
  - [ ] Wallet transactions list with filters + export (CSV v1 ok)
  - [ ] Cashout request flow (if supported)

## Public storefront (merchant + public)
- [ ] Shareable public storefront link (read-only)
- [ ] Caching-friendly rendering (fast first paint, minimal API calls)

## Sprint 2 Exit criteria (web-verifiable)
- [ ] A merchant can self-serve: setup → list products → handle orders → understand payouts.
- [ ] Partner dispatch flow is usable without ops chat.
- [ ] Settlement view matches backend totals and explains holds.

---

# Sprint 3 — Support + Finance Console (Operate like a company)

**Goal:** disputes and payouts don’t require engineers.

## Support console (support role)
- [ ] Search customer/merchant/driver by phone/email/id
- [ ] Ticket/dispute view (v1)
  - [ ] Attach order timeline snapshot
  - [ ] Internal notes + tagging (e.g., “refund requested”, “late delivery”, “fraud suspected”)
- [ ] Refund escalation helper (links to correct admin endpoints + checklists)

## Finance console (finance role)
- [ ] Settlement release workflow (v1)
  - [ ] View payable batches by date/store
  - [ ] Hold/release actions (audited)
- [ ] Reconcile dashboard
  - [ ] Last run status, mismatches, drill-down to ledger refs
  - [ ] Exportable reports (CSV/PDF later)

## Sprint 3 Exit criteria (web-verifiable)
- [ ] Support can resolve most disputes using timeline + notes + playbook links.
- [ ] Finance can run payout batches and explain holds without DB access.

---

# Sprint 4 — Quality Gates + Operability (Scale without chaos)

**Goal:** predictable releases, fewer regressions.

## CI + release hygiene
- [ ] GitHub Actions: `yarn test`, `yarn typecheck`, `yarn build`
- [ ] Branch protection: CI required to merge
- [ ] Versioned env templates + `docs/LOCAL_SETUP_WEB.md`

## Observability & safety rails
- [ ] Centralized logger (console in dev, hook for prod later)
- [ ] Error boundary pages with retry + “copy debug info”
- [ ] Feature flag support (simple env-driven v1)

## End-to-end testing
- [ ] Playwright smoke: login → role landing → open order search → open timeline
- [ ] Playwright critical: force-cancel requires reason; reassign shows confirm

## Sprint 4 Exit criteria (web-verifiable)
- [ ] CI blocks merges when tests fail.
- [ ] A basic Playwright suite catches the top 5 breakages before deploy.
