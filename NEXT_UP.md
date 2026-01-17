# NEXT_UP (single task only)

> Rule: This file MUST contain exactly ONE active task.
> Codex/agent loop: implement -> tests green -> docs updated -> check off in ROADMAP.md -> replace this file with the next single task.

## Active task

### Web production build: add `.env.production` + verify runtime config

**Goal:** Vite web app builds with PROD endpoints automatically (no code edits).

**PROD env (source of truth):**
- VITE_API_BASE_URL=https://api.gobai.app/api/v1
- VITE_SOCKET_URL=https://api.gobai.app
- VITE_SOCKET_PATH=/socket.io
- VITE_AUTH_LOGIN_PATH=/auth/login
- VITE_AUTH_ME_PATH=/user
- VITE_AUTH_LOGOUT_PATH=/auth/logout
- VITE_OPS_OFFER_DRIVER_PATH_TEMPLATE=/ops/orders/{orderId}/offer-driver
- VITE_OPS_REDISPATCH_PATH_TEMPLATE=/ops/orders/{orderId}/redispatch

## Acceptance criteria

- [ ] Add `.env.production` with PROD values.
- [ ] Keep `.env.development` for local values.
- [ ] Add `.env.example` (no secrets) and gitignore real env files if needed.
- [ ] `yarn build` / `npm run build` uses PROD values.
- [ ] Verify runtime config (log once on boot or a debug page):
  - [ ] API base url == https://api.gobai.app/api/v1
  - [ ] socket url == https://api.gobai.app
- [ ] Docs updated: how to run dev + how to build prod + where env lives.

## File list (expected)

- `.env.development`
- `.env.production`
- `.env.example`
- `.gitignore`
- `README.md` (or `docs/deploy.md`)
