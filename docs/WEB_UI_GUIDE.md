# GOBAI Web Command UI — User Guide (Ops / Admin / Partner / Merchant / Support / Finance)

This web app is the “command UI” for the GOBAI Delivery API. It maps **directly** to the API routes in `api/routes/api.php` (v1) and is intended for internal teams (ops/admin/support/finance) + partner/merchant portals.

> If an action is not available in the API, the UI will not assume it exists.

---

## 1) Quick start (developer)

### Configure environment variables
Create a `.env.local` (or `.env`) in the web project root:

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Optional overrides (only if your backend is deployed differently):

```bash
# Default UI calls POST /auth/login and expects {token, user}
VITE_AUTH_LOGIN_PATH=/auth/login

# Optional “who am I” and logout paths
VITE_AUTH_ME_PATH=/user
VITE_AUTH_LOGOUT_PATH=/auth/logout
```

Then:

```bash
npm install
npm run dev
```

### Login & roles
The UI reads the authenticated “viewer” role(s) from the login response and uses role‑based access control (RBAC) to show the right menus.

Supported roles:

- `ops`
- `admin`
- `partner` / `partner_ops`
- `merchant`
- `support`
- `finance`
- `system`

---

## 2) Navigation map (routes)

### Ops
- **/ops/dispatch** — Ops Dispatch Command Center
- **/ops/explain-stuck** — Ops Diagnostics (AI explain)

### Partner
- **/partner** — Partner Dashboard
- **/partner/dispatch** — Partner Dispatch (territory view)
- **/partner/apply** — Partner Apply

### Merchant
- **/merchant** — Merchant Order Board (lane view)
- **/merchant/products** — Products (limit + upgrade prompt)
- **/merchant/wallet** — Wallet balance + holds/releases
- **/merchant/payouts** — Cashout requests & history
- **/merchant/store** — Store settings
- **/merchant/audit** — Audit trail
- **/merchant/upgrade** — Upgrade plan
- **/merchant/ai** — Merchant AI assistant

### Support
- **/support** — Support Home
- **/support/disputes** — Disputes list
- **/support/disputes/:id** — Dispute detail timeline
- **/support/kb** — Knowledge base
- **/support/orders** — Order search
- **/support/tickets** — Support tickets
- **/support/users** — User search
- **/support/users/:id** — User detail

### Finance
- **/finance** — Finance overview
- **/finance/wallets** — Wallet balances (driver/merchant/customer)
- **/finance/reconcile** — Reconcile run + reports list
- **/finance/reconcile/reports/:id** — Reconcile report detail

### Admin
- **/admin** — Admin Home (queue overview)
- **/admin/partner-applications** — Partner applications queue
- **/admin/partners/:partnerUserId** — Partner detail
- **/admin/merchants** — Merchant approvals queue
- **/admin/drivers** — Driver applications + documents approval
- **/admin/cashins** — Wallet cash‑in approvals
- **/admin/cashouts** — Wallet cashout approvals
- **/admin/receipts** — Uploaded payment receipts review
- **/admin/orders/payment** — Manual order payment verify/reject by Order ID

### System
- **/system** — System Console
- **/system/compliance** — Compliance summaries

---

## 3) Role playbooks (how to use)

### A) Ops — Dispatch Command Center
Route: **/ops/dispatch**

What you can do:

1. **View** open orders / batches and assignment state.
2. **Offer** a job to a driver (sends an offer to a specific driver).
3. **Cancel search** (stops searching/offering for a stuck order).
4. **Explain stuck orders** with AI diagnostics.

API actions used:

- `GET /ops/analytics/overview` (overview cards)
- `GET /ops/orders` (queues)
- `POST /ops/orders/{order}/offer-driver` (manual offer)
- `POST /orders/{order}/cancel-search` (cancel search)
- `GET /ops/orders/{order}/ai/explain-stuck` (AI explain)

> Note: “Redispatch” is only shown if your backend exposes a redispatch endpoint; otherwise the UI will show a safe error.

---

### B) Partner — Territory dashboard + dispatch
Routes: **/partner**, **/partner/dispatch**

Partner dashboard shows:

- Today/month volume KPIs
- Assigned territories
- Fleet counts (drivers/stores)

Partner Dispatch is similar to Ops Dispatch but filtered for the partner’s assigned scope.

API actions used:

- `GET /partner/overview`
- `GET /partner/dispatch/orders`
- `POST /partner/orders/{order}/offer-driver`

---

### C) Merchant — Merchant OS v1
Routes: **/merchant** and tabs, **/merchant/ai**

1. **Order Board**: process orders in lanes (new → accepted → preparing → ready → completed/cancelled)
2. **Wallet**: see holds, available balance, and release status gates
3. **Payouts**: submit cashout requests; track approvals
4. **Products**: manage item list; UI enforces the MVP cap (default 5 items) and links to Upgrade
5. **Audit**: view settlement/release events and other key actions
6. **AI assistant**: generate promo and listing copy

Trust & settlement alignment:

- Holds are created on completion.
- Release is gated by trust requirements (open disputes, COD OTP, dropoff PIN/high‑value PIN, etc.).

Merchant AI endpoint:
- `POST /merchant/ai/generate`

---

### D) Support — Trust Layer v1
Routes: **/support/ai**, **/support/kb**, **/support/tickets**, **/support/disputes**, **/support/orders**, **/support/users**

Disputes:

- List disputes (filter/search)
- Open a dispute detail page to see status, reasons, evidence timeline

Orders:

- Search by reference/order id
- Validate current status + last events

Users:

- Search users
- View user profile + latest activity (as exposed by API)

AI Assist:

- Draft responses for customer questions
- Optionally create a support ticket

Knowledge base:

- List, create, update, and delete articles

Tickets:

- Create and update tickets
- Add conversation messages

API actions used:

- `POST /support/ai/assist`
- `GET /support/kb/articles`, `GET /support/kb/articles/{id}`
- `POST /support/kb/articles`, `PUT /support/kb/articles/{id}`, `DELETE /support/kb/articles/{id}`
- `GET /support/tickets`, `GET /support/tickets/{id}`
- `POST /support/tickets`, `POST /support/tickets/{id}/messages`
- `GET /support/disputes`, `GET /support/disputes/{id}`
- `GET /support/orders` (search)
- `GET /support/users`, `GET /support/users/{id}`

---

### E) Finance — Settlement Safety v2
Routes: **/finance**, **/finance/wallets**, **/finance/reconcile**

Finance overview:

- Total points across wallets (driver/merchant/customer)
- Pending cashin/cashout counts
- Today inflow/outflow totals
- Latest reconciliation report snapshot

Wallet balances:

- Filter by kind (driver/merchant/customer)
- Export/copy values (UI only)

Wallet adjust:

- Manual adjustments are protected: you must enter a reason and target kind/user.

Reconcile:

- Trigger reconcile run
- Browse reports and open a specific report

API actions used:

- `GET /finance/overview`
- `GET /finance/wallets/{kind}/balances`
- `POST /finance/wallets/adjust`
- `POST /finance/reconcile/run`
- `GET /finance/reconcile/reports`, `GET /finance/reconcile/reports/{id}`

---

### F) Admin — approvals & money controls
Routes: **/admin/***

Admin home is a queue dashboard. Use it to jump into:

1. **Partner applications**
   - Approve/reject partner apply submissions
2. **Merchant approvals**
   - Approve/reject merchants waiting for activation
3. **Driver applications**
   - Approve/reject driver profiles
   - Approve/reject driver documents (per document)
4. **Cashins / Cashouts**
   - Approve/reject wallet requests
   - Rejection requires a reason
5. **Receipts**
   - Review uploaded receipts
   - Approve/reject (reason required for rejection)
6. **Order Payment (manual)**
   - Verify/reject by Order ID if needed

API actions used:

- Partners: `GET /admin/partner-applications`, `POST /admin/partner-applications/{id}/approve|reject`
- Merchants: `GET /admin/merchants/pending`, `POST /admin/merchants/{user}/approve|reject`
- Drivers: `GET /admin/driver-applications`, `POST /admin/driver-applications/{id}/approve|reject`
- Driver docs: `POST /admin/driver-documents/{id}/approve|reject`
- Cashin: `GET /admin/wallet/cashin`, `POST /admin/wallet/cashin/{id}/approve|reject`
- Cashout: `GET /admin/wallet/cashout`, `POST /admin/wallet/cashout/{id}/approve|reject`
- Receipts: `GET /admin/receipts`, `GET /admin/receipts/{id}`, `POST /admin/receipts/{id}/approve|reject`
- Payment: `POST /admin/orders/{order}/payment/verify|reject`

---

### G) System — compliance summaries
Routes: **/system/compliance**

What you can do:

1. **Queue** a summary job with redaction options.
2. **List** summary jobs by status.
3. **Review** completed summaries and risk flags.

API actions used:

- `POST /system/compliance/summaries`
- `GET /system/compliance/summaries`
- `GET /system/compliance/summaries/{id}`

---

## 4) Notes about Guaranteed Delivery Tier
The API supports `service_tier=guaranteed` and guarantee fee/refund logic.

The **customer selection UI** (choose tier at quote/checkout) is normally implemented in the customer mobile app/web checkout UI, not the internal command UI.

If you want this command UI to also create quotes/orders with tier selection, add a new “Quote Builder” page that calls your booking/quote endpoints.

---

## 5) Troubleshooting

- **403 / Unauthorized**: your account role doesn’t include the required role for that page.
- **404**: endpoint not mounted (verify your API base URL and route prefix).
- **422 validation error**: the UI will show the backend message; usually a required “reason” field was empty.

# Fullscreen

Hotkeys:

H → toggle header

F → toggle fullscreen

Esc → exit fullscreen
