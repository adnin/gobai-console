# copilot-instructions.md — Web focus (Ops + Merchant Console, enterprise UX)

You are an advanced coding agent working **inside this repo only**: `ops-dispatch-command-ui` (React 19 + Vite + TS + Tailwind 4).

This project’s purpose: **implement and keep the WEB UI in sync with the API** for:
- Ops Console MVP (search, timeline, force-cancel, driver reassign, audit visibility)
- Dispatch assignment + manual overrides
- Health + stuck order detection UI
- Settlement + wallet operator clarity
- Merchant rules v1 + merchant KPIs + public storefront (read-only)

You must deliver **enterprise-grade UX** and **scalable feature structure** while keeping changes minimal.

---

## Priority order (what to work on)
When reading roadmap-like docs, focus on these areas **for the web** in this order:

1) **Ops Console MVP**
   - Admin order search (filters, pagination, deterministic ordering)
   - Admin order timeline (canonical timeline display)
   - Admin force-cancel (guarded + reason + confirmation + audit)
   - Admin driver reassign (driver_id + confirmation + audit)
   - Audit visibility (who/when/why; before/after snapshots when available)

2) **Dispatch Assignment + Manual Overrides**
   - Assign to specific driver
   - Unassign/reset assignment safely
   - Show late-risk / heartbeat signals (ops-visible fields)
   - Surface timeout/retry status (if the API returns it)

3) **Production readiness UI**
   - `/health` screen (db/redis latency + queue/scheduler heartbeat + rollups)
   - Stuck orders list with reason codes, drill-down into order timeline

4) **Settlement & Wallet clarity**
   - Driver wallet read model (driver + admin views)
   - Merchant/store settlement summary (earned/pending/paid + hold reasons + ETA)
   - Refund/cancellation path visibility (show timeline refs to ledger/payments)

5) **Merchant MVP surfaces**
   - Merchant operational controls (open/close, pause, prep time, overrides)
   - Merchant KPI basics (daily/weekly orders + revenue summary)
   - Public storefront (shareable read-only link) – caching-friendly and resilient

If multiple tasks exist, ALWAYS do only the single task in `NEXT_UP.md`.

---

## Non-negotiables (workflow)
1) Always read `NEXT_UP.md` first — it contains **exactly one** task.
2) Implement the **smallest safe change** that satisfies the task.
3) Make **exactly one commit** per task with the specified commit message.
4) After checks pass:
   - Tick the checkbox(es) in `ROADMAP_WEB.md` (or `ROADMAP.md` if used)
   - Replace `NEXT_UP.md` with **exactly one** next task.

Branch naming: `feat/<slug>` / `chore/<slug>` / `test/<slug>`.

Run on every task (strict):
- After edits (and after each fix batch):
  - `yarn typecheck`  ✅ must be green before moving forward
- Then:
  - `yarn test`
  - `yarn build` (when touching routing/build/types/config)

Stop conditions:
- If `yarn typecheck` fails, STOP all other work and fix TypeScript errors first.

---

### TypeScript diagnostics rule (must follow)
- After **every code change in the current file/page**, you MUST ensure there are **zero** TypeScript errors.
- Do this by:
  1) Checking VS Code **Problems** for the current file (preferred), and
  2) Running `yarn typecheck` after edits to confirm no errors remain.
- If `yarn typecheck` reports errors:
  - Fix them immediately (smallest safe change),
  - Re-run `yarn typecheck`,
  - Repeat until green.
- Do NOT ignore, comment-out, or “any”-cast away errors unless `NEXT_UP.md` explicitly allows it.
- If the error is “Cannot find name …”:
  - First search for an existing helper/util in the repo and import it,
  - Only create a new helper if none exists.

## Absolute constraints
- **Web-only**. Do not add or reference React Native / Expo / mobile dependencies.
- Do not change API contracts unless `NEXT_UP.md` explicitly says so.
- No large refactors. Create abstractions only when repeated **3+ times**.
- No new dependencies unless the task explicitly demands it.

---

## Tech stack (do not deviate)
- Yarn (classic)
- React 19 + Vite 7 + TypeScript 5
- react-router-dom 7
- @tanstack/react-query 5
- socket.io-client only when needed
- Tailwind CSS 4 + clsx + tailwind-merge + class-variance-authority
- vitest + Testing Library + jsdom

---

## Enterprise UX standards (must pass)
Every screen must have:
- **Loading state** (skeleton/spinner)
- **Error state** (friendly + retry)
- **Empty state** (clear explanation + CTA)
- **Unauthorized/Forbidden** state (role-aware messaging)

Every privileged mutation (force-cancel, reassign, assign/unassign, pause/unpause, overrides):
- Confirmation dialog for irreversible/destructive actions
- Required reason fields when API requires it
- Pending state (disable buttons, show progress)
- Success + failure toast
- Update cached data correctly (invalidate or optimistic update)
- Surface validation errors near the relevant inputs

Accessibility minimum:
- No clickable divs for primary actions
- Dialog focus trap + ESC close where appropriate
- `aria-label` for icon-only actions
- Keyboard navigation must work

---

## Scalable structure (feature-first)
Follow this structure; align with existing repo conventions if already present.

- `src/ui/`
  - App primitives: Button, Input, Select, Dialog, Toast, Badge, Skeleton, EmptyState, ErrorState, Table scaffolds
- `src/features/<feature>/`
  - `api.ts` (API calls for the feature)
  - `types.ts` (request/response types)
  - `keys.ts` (react-query keys)
  - `hooks.ts` (queries/mutations)
  - `components/*`
  - `pages/*`

Recommended features for THIS roadmap:
- `src/features/adminOrders/` (search + timeline + force-cancel + reassign)
- `src/features/dispatch/` (assignment + overrides + driver signals)
- `src/features/health/` (health dashboard)
- `src/features/stuckOrders/` (stuck list + drilldown)
- `src/features/wallets/` (driver wallet + admin driver wallet)
- `src/features/settlement/` (merchant settlement summary)
- `src/features/merchantControls/` (pause/open/prep-time overrides)
- `src/features/merchantKpi/` (daily/weekly KPIs)
- `src/features/storefrontPublic/` (share link read-only views)

Do NOT create all of these unless required by the current single task; create only what the task needs.

---

## Routing + auth (web)
- Keep routing centralized where the repo already does it.
- Routes must be role-aware (admin/ops/merchant).
- Prefer a single, shared auth/session source (token storage + current user).
- Unauthorized must never crash. Show a clear screen and a path to sign in.
- Do not hardcode roles. Use typed role checks.

---

## API integration rules (critical)
- Use the repo’s single HTTP wrapper (no duplicate clients).
- Keep API error normalization in one place.
- Types must match the API response shapes; do not invent fields.
- React Query:
  - Stable query keys, colocated with the feature
  - Invalidate minimal scopes after mutations
  - Avoid refetch loops; use `enabled` for conditional queries

If an endpoint returns deterministic ordering/pagination, reflect it in UI:
- show page controls
- preserve sort/order fields
- avoid client-side reshuffling that breaks determinism

---

## Data presentation guidelines (Ops-grade)
### Orders search
- Filters: order_id, customer phone/email, driver_id, store_id, status, date range
- Pagination + “results count”
- Row click -> Order details page with timeline panel

### Timeline view
- Display canonical sections (as available):
  - transitions
  - assignments
  - payments/ledger refs
  - notes/audit
- Deterministic ordering; show timestamps clearly
- Provide copy buttons for IDs (order_id, ledger tx ids) for ops workflows

### Force-cancel
- Required: reason
- Show guardrails/allowed states (if API provides)
- Confirm dialog must restate the impact
- On success: refetch timeline + search row updates

### Reassign driver
- Required: driver_id
- Provide safe UI: searchable driver selector if available; else validated input
- Confirm dialog warns about invalidating prior assignment

### Health dashboard
- Show rollup status: OK/WARN/CRIT
- Show metrics: DB/Redis latency, queue worker heartbeat, scheduler heartbeat
- Provide “refresh” + auto refresh toggle (off by default)

### Stuck orders
- List with reason codes
- Filters (reason/status/time window)
- Drilldown -> timeline and recommended ops actions (force-cancel/reassign) if allowed

### Wallets & settlement
- Always show:
  - totals
  - recent transactions
  - hold reasons + ETA (even if coarse)
- Ensure formatting is safe:
  - currency formatting
  - never float-math in UI calculations; display server values

---

## Testing rules (must be meaningful)
Add/update tests when behavior changes:
- Screen state tests: loading/error/empty/unauthorized
- Mutation tests: confirm dialog -> success toast -> cache updates
- API module tests: request shaping + error normalization (if repo pattern supports)

Mock at the boundary (HTTP wrapper or feature api module).
Tests must be deterministic.

---

## Definition of Done (per task)
A task is done only when:
- UI works end-to-end for the task’s endpoints
- All states handled (loading/error/empty/unauthorized)
- Mutations confirmed + toasts + cache invalidation
- `yarn typecheck` and `yarn test` pass
- Roadmap checkbox ticked (if applicable)
- `NEXT_UP.md` replaced with exactly one next task
- Exactly one commit created

---

## “Do not do” list
- Don’t add new libraries for tables/forms/state unless required
- Don’t refactor whole folders to “clean up”
- Don’t change backend assumptions; API is source of truth
- Don’t ship UI that lacks confirmation/toasts for privileged actions
- Don’t ship pages that crash on unauthorized or missing data

## Temporary testing policy (speed mode)
- For now, prioritize integration + UX completion.
- Do NOT add new Vitest tests unless a change is high-risk or regression-prone.
- Still run `yarn typecheck` on every task.
- Manual QA is required: verify loading/error/empty/forbidden states and core happy paths.
- After Sprint KPI + Ops Console are integrated, re-enable tests and add coverage for critical flows.
