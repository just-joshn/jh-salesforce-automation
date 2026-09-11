# Cross-Service Critical User Journeys — B. Account Lifecycle


### B1. Register a new account

- **User**: Guest wanting persistent identity.
- **Context**: `/global/en-US/registration` (or checkout "Create Account").
- **Goal**: Get an authenticated session tied to a real customer record.
- **Boundaries**: Storefront UI → SLAS (token) → Shopper Customers (`POST /customers`).
- **Interactions**: Fill first/last/email/password (live strength checklist) → submit.
- **Branches**: Valid, deliverable-looking email → success; email the platform's validation
  rejects → 400 surfaced inline.
- **Dependencies**: Shopper Customers create-customer endpoint; SLAS session issuance on success.
- **Outcomes**: Success lands on `/account` with `My Account`, `Account Details`, `Log Out` visible
  and a customer ID minted. Failure keeps the form with an inline validation message.
- **Criticality**: P0 — gateway to every signed-in journey.
- **Measurement**: `POST .../customers` status; presence of `Open account menu` button
  post-registration.
- **Evidence**: `cuj-discovery-20260826@example.com` → **400 "Invalid Email"**, detail _"The
  profile email address 'cuj-discovery-20260826@example.com' isn't valid."_ Retried with
  `cuj-discovery-20260826@outlook.com` → success, customer ID **`abwrBHxbAVlXIRlekWxqYYkXI1`**, UI
  showed `My Account` / `Account Details` / `Log Out`. (Same `@example.com` rejection independently
  reproduced during guest checkout contact info — see Cross-Cutting Behavior.)

### B2. Sign in with password (valid and invalid)

- **User**: Returning shopper.
- **Context**: `/login`, or the checkout "Or Login With → Password" tab.
- **Goal**: Reach an authenticated session.
- **Boundaries**: Storefront UI → SLAS (`oauth2/login`, PKCE) → `/callback` → `oauth2/token`.
- **Interactions**: Email → Continue → Password tab → password → Sign In.
- **Branches**: Correct credentials → redirect to `/account`; wrong credentials → inline alert, no
  redirect.
- **Dependencies**: SLAS login/token/callback chain; Shopper Customers profile fetch.
- **Outcomes**: Success: URL becomes `/account`, `Open account menu` renders. Failure: `role=alert`
  message, form stays put.
- **Criticality**: P0.
- **Measurement**: Presence of `role=alert`; final URL.
- **Evidence**: Wrong password → UI alert **"Something went wrong. Try again!"** Correct password
  (`CujDiscovery!2026`) → landed on `/account`, full request chain
  `POST oauth2/login → 303 → GET /callback?...code=... → 200 → POST oauth2/token → 200 → GET
customers/{id} → 200`.

### B3. Passwordless (email one-time code) login

- **User**: Returning shopper preferring OTP over password.
- **Context**: `/login`, default "Continue" path (no Password tab click).
- **Goal**: Authenticate without remembering a password.
- **Boundaries**: Storefront UI → SLAS `oauth2/passwordless/login` → SLAS
  `oauth2/passwordless/token`.
- **Interactions**: Email → Continue → "Confirm it's you" modal with the configured number of
  boxed digits → Resend Code available after cooldown.
- **Branches**: Correct code → session; incorrect/expired code → inline failure, code boxes remain
  editable.
- **Dependencies**: `login.passwordless.enabled=true`, `mode="email"`,
  `landingPath="/passwordless-login-landing"` (live config).
- **Outcomes**: Failure path fully verified. Success path requires reading the real email delivery,
  which this evidence pass cannot access — documented as a boundary, not skipped silently.
- **Criticality**: P1 (alternate to P0 password login).
- **Measurement**: `POST oauth2/passwordless/token` status.
- **Evidence**: Config confirms feature is on. Submitting an arbitrary code matching the rendered
  input count → `POST .../oauth2/passwordless/token` → **401**, UI showed **"Invalid token"**.

### B4. Social login (Google / Apple)

- **User**: Returning shopper with a Google/Apple identity.
- **Context**: `/login`, "Or Login With → Google/Apple".
- **Goal**: Federated authentication without a storefront password.
- **Boundaries**: Storefront UI → SLAS `oauth2/authorize` (hint=google|apple) → IdP →
  `/social-callback`.
- **Interactions**: Click Google or Apple button.
- **Branches**: N/A — the demo's public SLAS client blocks this call outright, both IdPs,
  identically.
- **Dependencies**: `login.social.enabled=true`, `idps=["google","apple"]`,
  `redirectURI="/social-callback"` (live config) — feature is **on**, but the proxy in front of
  SLAS forbids the call.
- **Outcomes**: Both buttons fail the same way before reaching an IdP consent screen.
- **Criticality**: P1 documented-blocked — this is an infrastructure/proxy restriction on the
  shared public demo, not a feature flag, so it is recorded as a live defect rather than a
  config-off complement.
- **Measurement**: `GET oauth2/authorize` status.
- **Evidence**: `hint=google` → **403**; `hint=apple` → **403**; both bodies:
  `{"message":"Request to /shopper/auth/v1/organizations/f_ecom_zzrf_001/oauth2/authorize is not
allowed through the SLAS Private Client Proxy"}`.

### B5. Reset a forgotten password (email callback)

- **User**: Locked-out returning shopper.
- **Context**: `/login` → "Forgot password?" → `/reset-password`.
- **Goal**: Regain account access via emailed link.
- **Boundaries**: Storefront UI → SLAS reset-password request.
- **Interactions**: Enter email → Reset Password → confirmation screen.
- **Branches**: Request accepted regardless of whether the address exists (standard
  anti-enumeration behavior) — UI always shows the same confirmation copy.
- **Dependencies**: `login.resetPassword.mode="email"` (live config) — the callback-only reset
  journey applies here, not an in-app token flow.
- **Outcomes**: UI swaps to a confirmation panel; actual reset requires the emailed link, outside
  this evidence pass.
- **Criticality**: P0 (account recovery is a hard blocker if broken).
- **Measurement**: Confirmation copy renders; request completes without error.
- **Evidence**: Submitted `cuj-discovery-20260826@outlook.com` → UI **"Password Reset — You will
  receive an email at cuj-discovery-20260826@outlook.com with a link to reset your password
  shortly."**

### B6. Self-service password change (signed-in)

- **User**: Signed-in shopper.
- **Context**: `/account` → Password card → Edit.
- **Goal**: Rotate password while authenticated.
- **Boundaries**: Storefront UI → Shopper Customers `PUT /customers/{id}/password` → silent SLAS
  re-auth.
- **Interactions**: Current password, new password (live strength checklist), confirm → Save.
- **Branches**: Correct current password → success, session silently re-established; (not tested:
  wrong current password, expected to fail server-side).
- **Dependencies**: Password update transparently re-triggers the full
  `oauth2/login → callback → token` chain to keep the session valid under the new credential.
- **Outcomes**: Toast **"Password updated"**; account page usable immediately after, no forced
  re-login prompt.
- **Criticality**: P1.
- **Measurement**: `PUT .../password` status; subsequent silent token refresh succeeds.
- **Evidence**: `PUT .../customers/abwrBHxbAVlXIRlekWxqYYkXI1/password` → **204**, followed
  automatically by `POST oauth2/login → 303 → GET /callback → 200 → POST oauth2/token → 200`.
  Reverted the password the same way immediately after, confirming the flow is repeatable.

### B7. Edit profile details (phone number)

- **User**: Signed-in shopper.
- **Context**: `/account` → My Profile → Edit.
- **Goal**: Keep contact info current.
- **Boundaries**: Storefront UI → Shopper Customers `PATCH /customers/{id}`.
- **Interactions**: Edit phone field → Save.
- **Branches**: Save → persisted; (Cancel not exercised).
- **Dependencies**: None beyond the customer record itself.
- **Outcomes**: New value renders immediately and survives a full page reload.
- **Criticality**: P2.
- **Measurement**: `PATCH` status 200; value stable after `reload()`.
- **Evidence**: Set phone to `(415) 555-0142` → `PATCH .../customers/{id}` → **200** → displayed
  value survived `page.reload()`.

### B8. Manage saved addresses (add, default, remove)

- **User**: Signed-in shopper.
- **Context**: `/account/addresses`.
- **Goal**: Speed up future checkouts with a saved address book.
- **Boundaries**: Storefront UI → Shopper Customers `/customers/{id}/addresses`.
- **Interactions**: Empty state → Add Address → fill form, check "Set as default" → Save → card
  shows `Default` badge → Remove → confirm → back to empty state.
- **Branches**: Zero addresses vs. one-or-more; default flag toggling.
- **Dependencies**: None external.
- **Outcomes**: Empty-state copy **"No Saved Addresses"** on both ends of the lifecycle.
- **Criticality**: P1 (feeds checkout pre-fill).
- **Measurement**: `POST` → 200, `DELETE` → 204, UI state matches.
- **Evidence**: `POST .../addresses` → **200**, card rendered `Default / CUJ Address / 2 Market
Street / San Francisco, CA 94105 / US`. `DELETE .../addresses/{id}` → **204**, UI reverted to
  **"No Saved Addresses."**

### B9. View order history and order detail

- **User**: Signed-in shopper.
- **Context**: `/account/orders` and `/account/orders/{orderNo}`.
- **Goal**: Confirm a past purchase and check its status.
- **Boundaries**: Storefront UI → Shopper Customers `/customers/{id}/orders?expand=oms` → Shopper
  Orders `/orders/{orderNo}?expand=oms,+oms_shipments`.
- **Interactions**: List → click order card → detail page (payment method, billing address, line
  items, tracking).
- **Branches**: Order exists and is OMS-unmanaged (this demo) vs. OMS-managed (would show real
  tracking — not available here).
- **Dependencies**: Order Management is **not connected** on this demo — the Tracking panel exposes
  that boundary directly to the shopper.
- **Outcomes**: List card shows `Order Number`, item count, total, `Shipped to`. Detail page shows
  full breakdown; Tracking says **"Not shipped"**.
- **Criticality**: P0 (post-purchase trust).
- **Measurement**: `GET .../orders?expand=oms` → 200; `GET .../orders/{orderNo}?expand=oms,+oms_shipments`
  → 200.
- **Evidence**: Order **00291357** listed with `1 item`, `$45.99`, `Shipped to: Signed Shopper`.
  Detail page: Payment Method **Visa •••• 1111 12/2030**, Billing Address, Order Summary
  **Subtotal $30.00 / Shipping $15.99 / Tax $2.20 / Total $45.99**, Tracking section **"Not
  shipped."**

---
