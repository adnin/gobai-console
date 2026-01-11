# Dispatch Command UI (Starter + RBAC + Sanctum Token Auth)

This is a **role-based** React web console with a working Ops Dispatch board and real backend auth wiring.

## Backend alignment (from your `api.zip`)
- `POST /auth/login` expects: `{ login, password }`
- `GET /user` returns authenticated user
  - Your `User` model appends `role_name`, which we use to map roles to console modules.
- Logout route may not exist; we clear token locally, and call `/auth/logout` best-effort if you add it later.

## Configure
Create `.env.local`:

```env
VITE_API_BASE_URL=https://your-api.com/api/v1
VITE_AUTH_LOGIN_PATH=/auth/login
VITE_AUTH_ME_PATH=/user
VITE_AUTH_LOGOUT_PATH=/auth/logout
```

## Run
```bash
yarn
yarn dev
```

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
