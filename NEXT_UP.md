# NEXT_UP.md

- [ ] Add **route-guard tests** for `RequireAuth` + `RequireRoles`:
  - Unauthenticated user visiting a protected route is redirected to `/login`.
  - Authenticated but unauthorized role is redirected to `/unauthorized`.

Definition of done:
- Tests cover both guards using a small MemoryRouter setup (no backend calls).
- No existing routes or behavior changes; tests only.

Commit message:
- `test: add route-guard coverage for RequireAuth/RequireRoles`
