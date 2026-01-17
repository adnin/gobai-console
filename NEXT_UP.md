# NEXT_UP (single task only)

> Rule: This file MUST contain exactly ONE active task.
> Codex/agent loop: implement -> tests green -> docs updated -> check off in ROADMAP.md -> replace this file with the next single task.

## Active task

### Ops KPI route gating (ops/admin only)

**Goal:** Lock `/ops/kpi` behind the ops + admin roles so merchants/partners/etc. see the Unauthorized page instead of KPI data.

## Acceptance criteria

- [ ] Update the `/ops/kpi` route definition to require either `ops` or `admin` using the existing guard primitives (`RequireAuth`, `RequireRoles`).
- [ ] Unauthorized viewers should see the dedicated Unauthorized screen (same UX as other gated routes) without throwing router errors.
- [ ] Authorized viewers must continue to reach the KPI screen with no regression.
- [ ] Add/adjust tests that cover both authorized and unauthorized navigation (router tests live in `src/tests`).
- [ ] Run `yarn typecheck` + `yarn test` (and `yarn build` if routing config changes) before handing off.

## File list (expected)

- `app/router.tsx`
- `app/shell/RequireRoles.tsx`
- `src/tests/router.*`
- `ROADMAP_WEB.md`
