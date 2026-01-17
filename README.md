# Dispatch Command UI (Starter + RBAC + Sanctum Token Auth)

This is a **role-based** React web console with a working Ops Dispatch board and real backend auth wiring.

## Backend alignment (from your `api.zip`)
- `POST /auth/login` expects: `{ login, password }`
- `GET /user` returns authenticated user
  - Your `User` model appends `role_name`, which we use to map roles to console modules.
- Logout route may not exist; we clear token locally, and call `/auth/logout` best-effort if you add it later.

## Configure
1. `.env.development` ships with sane local defaults (Laravel backend on `http://localhost:8000`). Update it only if your local stack uses a different host/port.
2. `.env.production` is committed with the Gobai production endpoints. Override via `.env.production.local` if you need a different target for builds.
3. Copy `.env.example` to `.env.local` (and `.env.production.local` if needed) to keep secrets or developer-specific overrides out of git.

Every mode follows Vite's loading order, so `.env.local` overrides `.env.development`, and `.env.production.local` overrides `.env.production` during `yarn build`.

## Run
```bash
yarn
yarn dev
```

## Build (production)
```bash
yarn build
```
The build process automatically consumes `.env.production` (plus `.env.production.local` overrides) so emitted assets target `https://api.gobai.app` and `https://api.gobai.app/api/v1`.

On boot the app logs a `[RuntimeConfig]` entry to confirm the resolved API and socket URLs. In production the log highlights whether the values match the Gobai endpoints, making it easy to spot misconfigured deployments without instrumenting the API.

## UI docs

See `docs/WEB_UI_GUIDE.md` for the full Ops/Admin/Partner/Merchant/Support/Finance workflows and route map.

## Tests
```bash
yarn test
```

### What tests cover
- Role normalization from backend user record:
  - `role_name` (preferred)
  - `role.name` / `role.slug`
  - `roles[]` array
- Auth flow:
  - login stores token + viewer
  - refreshMe sends Bearer token and updates viewer roles


## Realtime dependency
If you see missing dependency errors, ensure this is installed:

```bash
yarn add socket.io-client
```
