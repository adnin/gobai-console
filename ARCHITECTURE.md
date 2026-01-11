# Architecture — GOBAI Web Command UI

This repo is a **multi-role** internal console (Ops/Admin/Partner/Merchant/Support/Finance/System) aligned to the GOBAI Delivery API.

## Tech stack
- Vite + React + TypeScript
- React Router DOM (routing)
- TanStack React Query (server state)
- Axios (`src/lib/api.ts`) for HTTP
- Tailwind v4 with semantic tokens (`src/index.css` + `docs/DESIGN_SYSTEM.md`)

## Directory layout
- `src/app/`
  - `router.tsx` — route definitions + RBAC guards
  - `shell/` — AppShell, RequireAuth, RequireRoles
  - `pages/` — auth/utility pages (Login, Logout, Unauthorized)
- `src/features/<domain>/`
  - `pages/` — routeable screens
  - `types.ts`, `utils.ts`, `mappers.ts` — domain logic
  - `*Api.ts` — API wrappers (use `src/lib/api.ts`)
- `src/components/`
  - `ui/` — reusable shadcn-style UI primitives
  - other shared components
- `src/design/`
  - tokenized primitives + theme helpers
- `src/lib/`
  - API client, auth, env, RBAC, sockets/realtime, shared utilities

## Adding a new screen
1. Create page: `src/features/<domain>/pages/<Name>Page.tsx`
2. Register route: `src/app/router.tsx`
3. Guard with roles: `<RequireRoles roles={[...]} />` (or `<RequireAuth />`)
4. Use existing UI primitives + semantic Tailwind tokens
5. Add tests if logic is non-trivial

## Role gating
RBAC is enforced in the router and shell. Do not rely on “UI only” checks for security; the backend must enforce roles too. The UI should fail safely if endpoints are missing.
