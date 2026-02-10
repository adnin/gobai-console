# Sprint 2.5 — On‑Demand Expansion (Parcel Pooling + Ticketing + Ride Share)

**Goal:** unlock new revenue lines (parcel pooling + service tickets + ride share) while keeping existing booking/dispatch stable.

Base path: `/api/v1`

---

## Status checklist (implementation)

## A) Driver Parcel Board (Today) + multi-claim (up to 3) without changing order status

- [x] Driver endpoint: list today’s eligible parcel orders (pool view) with claimed state + start windows
- [x] Claim endpoint: driver can claim a parcel (idempotent, concurrency-safe, no status change)
- [x] Release endpoint: driver can release their claim
- [x] “My claims” endpoint for driver dashboard (0–3)
- [x] Capacity rules: enforce `max_active_claims = 3` (+ optional weight/size caps)
- [x] TTL (optional but recommended): auto-expire claims + scheduler job
- [x] Feature tests:
  - [x] list filters correct (parcel + today + eligible only)
  - [x] claim idempotency + concurrency (only one wins last seat/claim)
  - [x] claim does NOT change `delivery_orders.status`
  - [x] max claims enforced
  - [x] release authorization (only owner)

## B) Ticketing products + unique redeem code + merchant redemption (auto-reserve on purchase)

- [x] Product support: `product_type=ticket` + validity window + terms
- [x] Issue tickets post-payment: generate `ticket_instances` per quantity with unique code/QR payload
- [x] Customer endpoints: list “My Tickets” + ticket detail (code + QR payload + status)
- [x] Merchant endpoints: list issued/unredeemed tickets + redeem by code
- [x] Security: rate limit redeem + non-guessable codes + policies (store-scoped)
- [x] Notifications/logging: rid-friendly redemption logs (avoid logging raw code)
- [ ] Feature tests (recommended follow-ups):
  - [ ] issuance only after payment confirmed
  - [ ] unique codes, correct quantity
  - [x] customer isolation (cannot view others)
  - [x] redeem once only (second redeem = 409)
  - [x] merchant isolation (other store cannot redeem)

## C) Ride Share Sessions (driver publishes seat-available trip + customers join with pax count)

- [x] Session model: driver publishes `open` session with `total_seats`, `starts_at`, route hint, location
- [x] Customer discovery: list nearby sessions with `reserved/total` (e.g., 2/5) + starts_at
- [x] Reservation: customer reserves with `pax_count` and capacity is enforced atomically
- [x] Lifecycle: `open → locked → in_progress → completed` (lock prevents new joins)
- [x] Cancellation policy (recommended): driver can cancel only while `open` (clear customer comms)
- [x] Notifications: join/lock/cancel events to driver/customers (persisted as DB notifications; no fetch API in v1)
- [x] Feature tests:
  - [x] capacity enforcement + pax_count validation
  - [x] concurrency: two reserves for last seat → only one succeeds
  - [x] lock prevents new reservations
  - [x] driver cancel allowed only in `open` + cascades reservation status updates

## Sprint 2.5 Exit criteria (API-verifiable)

- [x] Parcel Board live: drivers can claim/release up to 3 parcels and it does not change order status.
- [x] Ticketing live: customers can buy tickets, see code/QR, merchant can redeem once safely.
- [x] Ride Share live: driver sessions are discoverable, reservations enforce capacity, lock/cancel rules are deterministic.
- [x] Tests cover all three feature sets + policies + concurrency safety where applicable.

---

## Frontend integration (React / React Native)

This repo is API-only; this section is a practical integration guide for a React web app and/or React Native mobile apps. Adjust naming to your app’s conventions.

### Shared client conventions

**Headers**

- Always send `Accept: application/json`.
- Auth: `Authorization: Bearer <token>` (Sanctum).
- Request correlation (recommended): `rid: <uuid>` for critical actions (especially ticket redeem).

**Error handling**

- `401`: token invalid/expired → force re-auth.
- `403`: not allowed/role mismatch → show “Not allowed”.
- `404`: not found → show “Not found / invalid code”.
- `409`: conflict (already redeemed/claimed) → show a deterministic message and refresh state.
- `422`: validation (pax_count too high, max claims reached, etc.) → show field errors.

**Query strategy**

- Use a query cache (e.g. TanStack Query) with explicit keys per resource (`parcelBoard`, `myClaims`, `tickets`, `rideShareSessions`, etc.).
- Prefer invalidating a small set of keys after mutations rather than refetching everything.

**Suggested query keys**

- Parcel board: `['driver', 'parcel-board', { date }]`, `['driver', 'parcel-board', 'my-claims']`
- Tickets: `['customer', 'tickets', filters]`, `['merchant', 'tickets', filters]`
- Ride share: `['customer', 'ride-share', 'nearby', { lat, lng, radiusKm, paxCount }]`, `['customer', 'ride-share', 'reservations', 'me']`, `['driver', 'ride-share', 'session', id]`

---

## A) Driver Parcel Board — React integration

Canonical backend contract lives in `docs/driver-api.md` under **Parcel Board (Parcel pooling)**.

### Endpoints

- `GET /driver/parcel-board?date=today`
- `POST /driver/parcel-board/{order}/claim`
- `DELETE /driver/parcel-board/{order}/claim`
- `GET /driver/parcel-board/my-claims`

### UI flows

#### Driver “Parcel Board” screen

- Fetch `GET /driver/parcel-board`.
- Render cards with:
  - pickup/dropoff summary, weight + size tier, distance, driver fare
  - claim status: `is_claimed`, `claimed_by_me`, and `claim_expires_at` countdown when present
- Actions:
  - if `claimed_by_me`: show **Release** button
  - else if `is_claimed`: show **Claimed** (disabled)
  - else: show **Claim** button

#### Driver “My Claims” widget (home/dashboard)

- Fetch `GET /driver/parcel-board/my-claims` on home load.
- Show:
  - claimed parcels (0–3)
  - capacity summary (`available_slots`, weight caps if present)

### UX details (important)

- Claims expire (default 10 minutes). Show a countdown and periodically refresh the board (e.g., every 20–30s).
- Claim is idempotent for the same driver/order:
  - allow “double tap” safety (button can remain enabled but show loading).
- Claim does **not** assign the parcel or change `delivery_orders.status`.
  - Do not treat it as a dispatched/accepted job; it is a reservation/hold only.

### Implementation notes (React)

- Use a single mutation for claim and one for release.
- After success:
  - invalidate `['driver','parcel-board',…]` and `['driver','parcel-board','my-claims']`
- On `409` from claim:
  - show “Already claimed by another driver” and refetch the board.

---

## B) Ticketing — React integration (Customer + Merchant)

Canonical backend contract lives in `docs/api/v1/ticketing.md`.

### Customer endpoints

- `GET /customer/tickets?status=&store_id=`
- `GET /customer/tickets/{ticket}`

### Merchant endpoints

- `GET /merchant/tickets?status=&store_id=`
- `GET /merchant/tickets/{ticket}`
- `POST /merchant/tickets/redeem` (throttled)

### Customer app screens

#### “My Tickets” list

- Query `GET /customer/tickets`.
- Filters:
  - status tabs: `issued`, `redeemed`, `void`
  - store filter (optional)
- List item should show:
  - product name, store name, status, validity window (if set)

#### Ticket detail screen

- Query `GET /customer/tickets/{ticket}`.
- Render:
  - code (text)
  - QR (generate from `qr_payload`)
  - status + issued/redeemed timestamps
  - validity and terms (if present)

### Merchant app / web dashboard screens

#### “Tickets Sold” (issued/unredeemed list)

- Query `GET /merchant/tickets?status=issued`.
- Filters:
  - store selector (if merchant owns multiple stores)

#### “Redeem Ticket” (scan or enter code)

- Input sources:
  - manual code entry
  - QR scan (recommended QR payload is `{ code, store_id }`)
- Call `POST /merchant/tickets/redeem` with:
  - `code` (uppercase; backend normalizes)
  - `store_id` if available (helps disambiguation)
  - add `rid` header for correlation

**Recommended handling**

- `200`: show “Redeemed” + display ticket snapshot.
- `404`: “Invalid code”.
- `409`: “Already redeemed” (show timestamp if returned).
- `403`: “You cannot redeem tickets for this store.”
- `429`: rate limited → show “Too many attempts” and back off.

**Security note**

- Do not log or persist the raw code client-side beyond what is needed to redeem; treat codes as secrets.

---

## C) Ride Share — React integration (Driver + Customer)

Canonical backend contract lives in `docs/api/v1/ride-share.md`.

### Driver endpoints

- `POST /driver/ride-share/sessions`
- `PATCH /driver/ride-share/sessions/{session}`
- `POST /driver/ride-share/sessions/{session}/lock`
- `POST /driver/ride-share/sessions/{session}/start`
- `POST /driver/ride-share/sessions/{session}/complete`
- `POST /driver/ride-share/sessions/{session}/cancel`

### Customer endpoints

- `GET /customer/ride-share/sessions/nearby?lat=&lng=&radius_km=&pax_count=`
- `GET /customer/ride-share/sessions/{session}?pax_count=`
- `POST /customer/ride-share/sessions/{session}/reserve`
- `DELETE /customer/ride-share/sessions/{session}/reserve`
- `GET /customer/ride-share/reservations/me`

### Customer discovery UX

- Ask for location permissions (mobile) or browser location (web).
- Call `nearby` with `lat`, `lng`, and an optional `radius_km`:
  - response includes `distance_km`
  - response also includes `total_fare_for_pax` computed using `pax_count`
- Let users change `pax_count` before reserving:
  - refetch nearby/session detail when `pax_count` changes

### Reservation UX (capacity + concurrency)

- Reserve is transactional; only one customer can get the last seat.
- On `422` “Not enough seats available.”:
  - show a clear error and refetch session list/details.
- On successful reserve:
  - show the **locked fare** fields from the reservation:
    - `fare_per_seat_locked_cents`
    - `fare_total_locked_cents`
  - do not recompute totals client-side for receipts; always display locked values.

### Session lifecycle UX

- Driver can cancel only while `open`.
- Once `locked`, customers cannot reserve.
- When a driver cancels:
  - backend cascades active reservations to `cancelled` and frees seats.
  - customer UI should refresh `my reservations` to reflect cancellation.

### “Realtime” updates

Ride-share events are stored as Laravel database notifications, but **v1 does not expose an API endpoint to fetch them**.

Recommended v1 approach:

- Poll the relevant endpoints:
  - customer: `GET /customer/ride-share/reservations/me`
  - customer: `GET /customer/ride-share/sessions/nearby`
  - driver: your driver session management view (if you add a “my sessions” endpoint later)

---

## Configuration quick reference

### Parcel Board

- `config/driver.php`:
  - `PARCEL_CLAIM_MAX_ACTIVE` (default 3)
  - `PARCEL_CLAIM_TTL_MINUTES` (default 10)
- Scheduler:
  - `php artisan parcel-claims:expire`

### Ticketing

- `config/tickets.php` (code length/prefix/retry)
- `config/throttle.php` (`ticket_redeem` limiter)

### Ride Share

- `config/rideshare.php`:
  - `RIDESHARE_BASELINE_FARE_CENTS`
  - `RIDESHARE_PER_KM_RATE_CENTS`
  - `RIDESHARE_PER_MIN_RATE_CENTS`
  - `RIDESHARE_DISCOVERY_RADIUS_KM`
  - `RIDESHARE_MAX_DISCOVERY_RADIUS_KM`
  - `RIDESHARE_DISCOVERY_LIMIT`

---

## Implementation references (backend)

- Parcel Board API contract: `docs/driver-api.md`
- Ticketing API contract: `docs/api/v1/ticketing.md`
- Ride Share API contract: `docs/api/v1/ride-share.md`
- Tests:
  - Parcel Board: `tests/Feature/Driver/ParcelBoardTest.php`
  - Ticket endpoints: `tests/Feature/Tickets/TicketEndpointsTest.php`
  - Ride Share: `tests/Feature/RideShareSessionApiTest.php`, `tests/Feature/RideShareNotificationsTest.php`
