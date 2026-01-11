# AGENT.md — Web (React + Vite)

This repository follows a **one-commit-at-a-time** workflow for Copilot/Codex agents.

## Non‑negotiables
1) Always read `NEXT_UP.md` first — it contains **exactly one** task.
2) Implement the **smallest safe change** that satisfies the task.
3) Make **exactly one commit** per task with the specified commit message.
4) After checks pass:
   - Tick the checkbox in `ROADMAP_WEB.md` (or `ROADMAP.md` if you rename it)
   - Replace `NEXT_UP.md` with the next single task

## Branch naming
- Use: `chore/<slug>` or `feat/<slug>` or `test/<slug>`
- Example: `feat/role-aware-nav`

## Tech + conventions
- Package manager: **Yarn**
- Framework: React + Vite + TypeScript
- Routing: `react-router-dom`
- Data fetching: `@tanstack/react-query`
- Realtime: `socket.io-client` (where needed)
- UI primitives live in `src/ui/`
- Feature code lives in `src/features/<feature>/`

## Commands
- Dev: `yarn dev`
- Test: `yarn test`
- Typecheck: `yarn typecheck`
- Build: `yarn build`

## Quality bar (always)
- Every screen must handle: loading, empty, error, and unauthorized.
- Every privileged mutation must require confirmation and show a success/failure toast.
- Keep API contracts unchanged unless the task explicitly says otherwise.
