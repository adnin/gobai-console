# NEXT_UP (single task only)

> Rule: This file MUST contain exactly ONE active task.
> Codex/agent loop: implement -> tests green -> docs updated -> check off in ROADMAP.md -> replace this file with the next single task.

## Active task

### Sprint 4: Wire Dispatch SaaS Usage tab in Mobile (if scaffolded)

**Goal:** If the mobile app already has a Usage tab scaffold, wire it to the Dispatch SaaS /partner/usage endpoint with tenant-scoped auth and role gating (fleet_admin + finance_lite only). If the tab does not exist, create the minimal feature placeholder with navigation hidden for unauthorized roles and note any missing API gaps.

---

## Scope

- Reuse existing auth/token flow on mobile.
- Ensure tenant identifier is included on every request.
- Role-aware gating:
  - **fleet_admin + finance_lite** can access Usage
  - **dispatcher** cannot access Usage
- Provide loading/error/empty/unauthorized states.
- Date range filter default last 30 days (same semantics as web).

---

## Deliverables
- Mobile API client method for usage
- Usage tab wired (or scaffolded minimal screen if missing)
- Role-based gating
- Basic screen-view analytics event
