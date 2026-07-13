# Cross-Service Critical User Journeys — pwa-kit.mobify-storefront.com

Evidence gathered live against the public Salesforce PWA Kit demo (org `f_ecom_zzrf_001`, site
`RefArchGlobal`) via a Playwright CLI browser session, capturing UI state, network calls, and HTTP
status codes. Config facts were read live from `#mobify-data` on the page, never assumed. No git
history, diffs, or repository state were inspected to produce this document.

This is a discovery/evidence document, not the canonical `docs/critical-user-journeys.md` spec that
`e2e/tests/` and `api/tests/` are meant to follow (that file does not exist in this checkout). Treat
this as the raw material for building that spec, plus a live-defect log.

## How to read each entry

**User · Context · Goal · Boundaries · Interactions · Branches · Dependencies · Outcomes ·
Criticality · Measurement · Evidence**

---

## A. Discovery & Browse

### A1. Search for a product by keyword

- **User**: Any visitor (guest or signed-in).
- **Context**: Header search box, any page.
- **Goal**: Find a specific product fast.
- **Boundaries**: Storefront UI → Shopper Search (SCAPI) → Einstein-backed suggestions.
- **Interactions**: Type into search box → suggestion dropdown appears (categories, popular
  searches, product thumbnails) → "View All" or Enter → results page.
- **Branches**: Query with matches (suggestions + results) vs. no-match query.
- **Dependencies**: `search-suggestions` endpoint, `product-search` endpoint.
- **Outcomes**: Suggestion dialog populates within one keystroke debounce; results page shows a
  count heading.
- **Criticality**: P0 — primary discovery path.
- **Measurement**: `search-suggestions` returns 200 with `includeEinsteinSuggestedPhrases=true`;
  results heading count > 0.
- **Evidence**: `q=tie` → `GET .../search-suggestions?...&includeEinsteinSuggestedPhrases=true` →
  **200**, returned category chip "Ties", 5 product suggestions, "Popular Searches: shirt",
  `View All` → `/search?q=tie`. `q=shirt` results page: heading **"shirt" (46)**.

### A2. Browse a category and refine by facet

- **User**: Any visitor.
- **Context**: Category landing page (e.g., Womens).
- **Goal**: Narrow a large catalogue to relevant items.
- **Boundaries**: Storefront UI → Shopper Search (SCAPI, `refine=cgid=...`) → Shopper Products
  (category metadata).
- **Interactions**: Land on category → apply color/price/size/store-availability filters → chip
  appears → "Clear All" removes it.
- **Branches**: Facet narrows results vs. facet returns zero vs. filter cleared.
- **Dependencies**: `product-search` with `refine` params; `categories/{id}`.
- **Outcomes**: Result count updates; removable filter chip renders; URL/refine params stay in
  sync.
- **Criticality**: P0.
- **Measurement**: Result count changes match the applied refine; `refine=ilids=...` present when
  store-availability is checked.
- **Evidence**: Womens landing → **558** products (`refine=cgid=womens`, 200). Checking **"In stock
  at San Francisco Retail Store"** → new request adds `&refine=ilids=inventory_m_store_store1` →
  200 → heading **(9)**, chip **"Remove filter: In stock at San Francisco Retail Store"** rendered,
  `Clear All` present. Removing the chip restored the full **558** count.

### A3. Absent feature complement — Guided Shopping Agent

- **User**: Any visitor.
- **Context**: `commerceAgent.enabled` ships as the **string** `"false"` (compare exactly, never by
  truthiness).
- **Goal**: N/A — proving the absence is intentional, not a broken page.
- **Boundaries**: `#mobify-data` config only; no agent service is contacted.
- **Interactions**: Search for "tie" and inspect every entry point (header button, floating button,
  search-suggestions panel) for an agent affordance.
- **Branches**: None — this is a config-off complement, not a live journey.
- **Dependencies**: None (no agent host reachable).
- **Outcomes**: Search suggestions still work fully; zero agent UI anywhere.
- **Criticality**: N/A (documents an intentional absence).
- **Measurement**: `commerceAgent.enableAgentFromHeader`, `...FromFloatingButton`,
  `...FromSearchSuggestions` all string `"false"`.
- **Evidence**: Live config: `commerceAgent: {enabled:"false", askAgentOnSearch:"false",
enableAgentFromHeader:"false", enableAgentFromFloatingButton:"false",
enableAgentFromSearchSuggestions:"false", embeddedServiceEndpoint:"", scrt2Url:"",
salesforceOrgId:""}`. `find --regex '/agent|Agent|Ask|guided/'` on the search-suggestions panel →
  **no matches**. Search suggestions for "tie" fully functional in the same pass (see A1).

---

## B. Account Lifecycle

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

## C. Wishlist

### C1. Add a product to the wishlist (guest-authenticated)

- **User**: Signed-in shopper.
- **Context**: Product detail page or PLP tile heart icon.
- **Goal**: Save an item for later without adding to cart.
- **Boundaries**: Storefront UI → Shopper Customers `/customers/{id}/product-lists`.
- **Interactions**: Click `Add to Wishlist` on PDP.
- **Branches**: First add → succeeds silently, item appears on `/account/wishlist`; duplicate add →
  blocked with a toast, no new API mutation.
- **Dependencies**: Product-list creation is implicit on first use (a default wishlist list is
  created for the customer).
- **Outcomes**: `/account/wishlist` shows the product with color, quantity stepper, price, `Add to
Cart` and `Remove`.
- **Criticality**: P1.
- **Measurement**: `product-lists` GET reflects the item; duplicate add produces zero new
  POST/PUT traffic.
- **Evidence**: Added **Turquoise and Gold Hoop Earring** (`25720033M`, Gold) → item rendered on
  `/account/wishlist`. Re-adding the same item → UI toast **"Item is already in wishlist"** with
  `View`/`Close` actions, and the network log for that click showed no new list-mutation request —
  a clean idempotent no-op rather than a duplicate row.

### C2. Remove an item from the wishlist

- **User**: Signed-in shopper.
- **Context**: `/account/wishlist`.
- **Goal**: Clear an item no longer wanted.
- **Boundaries**: Storefront UI → Shopper Customers `DELETE /product-lists/{listId}/items/{itemId}`.
- **Interactions**: Remove → "Confirm Remove Item" dialog → "Yes, remove item".
- **Branches**: Confirm vs. "No, keep item" (not exercised, but dialog present).
- **Dependencies**: None external.
- **Outcomes**: Empty state **"No Wishlist Items — Continue shopping and add items to your
  wishlist."**
- **Criticality**: P1.
- **Measurement**: `DELETE` → 204; UI reflects empty state without reload.
- **Evidence**: `DELETE .../product-lists/cca6399e06c1d98131e83c823d/items/dc2744e57c42b53406f7da2062`
  → **204**.

### C3. Copy a wishlist item to cart

- **User**: Signed-in shopper.
- **Context**: `/account/wishlist`, item row.
- **Goal**: Convert a saved item into a purchase intent.
- **Boundaries**: Wishlist (Shopper Customers `product-lists`) → Cart (Shopper Baskets `items`).
- **Interactions**: `Add to Cart` button on the wishlist row.
- **Branches**: The action **copies** the item into the basket; it does not remove it from the
  wishlist. The two lists are independent after the click — confirmed by re-reading the wishlist
  immediately after and finding the row unchanged (still `Quantity: 1`, `Add to Cart`, `Remove`
  all present).
- **Dependencies**: Cross-service by definition — this is the wishlist→cart handoff. The click
  reuses the shopper's existing basket (`POST .../baskets/{existingBasketId}/items`) rather than
  creating a new one.
- **Outcomes**: Header cart badge increments immediately (`0` → `1`); `/cart` shows the item with
  identical color, quantity, and price to the wishlist row; the wishlist row itself is untouched.
  One incidental finding while reading the cart row: its `Choose delivery option` combobox showed
  `Pick Up in Store` as `[disabled]` for this line — worth a follow-up if BOPIS-from-wishlist is a
  journey the product wants to support, since the wishlist add flow does not carry forward a
  selected pickup store the way the PDP's own `Add to Cart` does.
- **Criticality**: P1.
- **Measurement**: Cart item count increments after click; `POST .../baskets/{id}/items` returns
  2xx; wishlist item count is unchanged after the same click.
- **Evidence**: Starting state: cart `0` items, wishlist `0` items (cleared during C2 testing).
  Re-added **Turquoise and Gold Hoop Earring** to wishlist → `POST .../product-lists/{listId}/items`
  → **200**. Clicked `Add to Cart` on the wishlist row → header badge became **`My cart, number of
items: 1`** → `POST .../baskets/f58548466b2937c497d73aa78d/items` → **200**. Re-read
  `/account/wishlist` in the same pass: row still present, `Quantity: 1`, `$30.00`, `Add to Cart`,
  `Remove` all intact — confirming copy, not move. Read `/cart`: heading **"Cart (1 item)"**, line
  item **Turquoise and Gold Hoop Earring, Color: Gold, Quantity: 1, $30.00**, **Subtotal $30.00** —
  full price/quantity fidelity preserved across the handoff.

---

## D. Cart

### D1. Add to cart, adjust quantity, remove

- **User**: Guest or signed-in shopper.
- **Context**: PDP → mini-cart flyout → `/cart`.
- **Goal**: Build a basket before checkout.
- **Boundaries**: Storefront UI → Shopper Baskets (`POST /baskets`, `POST .../items`,
  `PATCH .../items/{id}`, `DELETE .../items/{id}`).
- **Interactions**: `Add to Cart` → flyout with `View Cart`/checkout shortcut → `/cart` → increment
  quantity → remove with confirm dialog.
- **Branches**: Empty cart vs. populated; remove-confirm vs. cancel.
- **Dependencies**: Basket auto-creates on first add; product detail refetch after quantity change
  re-syncs price and availability.
- **Outcomes**: Empty state **"Your cart is empty."** (guest copy: _"Sign in to retrieve your saved
  items or continue shopping."_, signed-in copy: _"Continue shopping to add items to your
  cart."_).
- **Criticality**: P0.
- **Measurement**: `POST .../items` → 200; `PATCH` → 200; `DELETE` → 200; header cart-count badge
  matches item count.
- **Evidence**: `POST .../baskets` → 200 → `POST .../items` → 200 → header badge `"1"`. Increment →
  `PATCH .../items/{id}` → 200, quantity **2**. Remove (with `Yes, remove item` confirm) →
  `DELETE .../items/{id}` → 200, badge `"0"`, empty-state copy rendered correctly for both guest
  and signed-in variants.

### D2. Guest cart merges into account cart on login

- **User**: Guest who added items, then signs in.
- **Context**: Any page with items already in the guest basket, then `/login`.
- **Goal**: Not lose in-progress shopping when authenticating.
- **Boundaries**: Guest Shopper Baskets → SLAS login → Shopper Baskets `POST /baskets/actions/merge`.
- **Interactions**: Add item as guest → navigate to `/login` → sign in with existing credentials.
- **Branches**: Guest basket empty (no merge needed) vs. populated (merge fires).
- **Dependencies**: This is the core cross-service journey binding anonymous and authenticated
  identity — SLAS session swap plus a dedicated basket-merge call.
- **Outcomes**: Post-login cart still shows the pre-login item at the same quantity and price.
- **Criticality**: P0 — losing a cart on sign-in is a top cart-abandonment driver.
- **Measurement**: `POST .../baskets/actions/merge?createDestinationBasket=true` → 200; cart badge
  count unchanged across the login boundary.
- **Evidence**: Added 1 guest item → signed in → `POST .../baskets/actions/merge?siteId=RefArchGlobal&createDestinationBasket=true&locale=en-US`
  → **200** → `/cart` still showed **"Cart (1 item)" — Turquoise and Gold Hoop Earring, $30.00**.

---

## E. Checkout

### E1. Guest checkout — Ship to Address (Standard Delivery Purchase)

- **User**: Guest shopper.
- **Context**: `/checkout` from a populated cart.
- **Goal**: Place an order without creating an account.
- **Boundaries**: Cart → Checkout UI → Shopper Baskets (customer/shipping-address/shipping-method/
  payment-instruments/billing-address) → Shopper Orders `POST /orders`.
- **Interactions**: Contact Info (email) → `Checkout as Guest` → Shipping Address form →
  `Continue to Shipping Method` → select Ground/2-Day/Overnight/Express → Payment (Credit Card
  fields) → `Review Order` → `Place Order`.
- **Branches**: Valid email → proceeds; platform-rejected email domain → inline **"An unexpected
  error occurred during checkout."** alert with the offending address still shown, form re-editable
  in place (graceful recovery, not a dead end).
- **Dependencies**: Full basket-to-order chain across Shopper Baskets and Shopper Orders; tax and
  shipping recalculate per step.
- **Outcomes**: Confirmation page with `Order Number`, delivery/payment/summary breakdown, and an
  optional inline "Create an account for faster checkout" upsell pre-filled with the just-used
  email.
- **Criticality**: P0 — the revenue path.
- **Measurement**: `POST /orders` → 200; confirmation URL is `/checkout/confirmation/{orderNo}`.
- **Evidence**: `cuj-discovery@example.com` rejected checkout with the unexpected-error alert (same
  email-domain rejection pattern as B1); recovered by continuing with a real order using
  `cuj-discovery-20260826@outlook.com`. Order **00291247** confirmed: _"We will send an email to
  cuj-discovery-20260826@outlook.com with your confirmation number and receipt shortly."_ Payment:
  Visa •••• 1111, 12/2030.

### E2. Guest checkout — Buy Online, Pick Up In Store

- **User**: Guest shopper near a physical store.
- **Context**: PDP → toggle `Pick Up in Store` → `/checkout`.
- **Goal**: Skip shipping cost/time by collecting in person.
- **Boundaries**: Storefront UI → Shopper Stores (pickup store resolution) → Shopper Baskets →
  Shopper Orders.
- **Interactions**: Select `Pick Up in Store` on PDP → store auto-resolves to nearest stocking
  location → checkout skips a shipping-address step, going straight to `Pickup Address &
Information` → Payment → Place Order.
- **Branches**: Item in stock at the resolved store (only branch exercised).
- **Dependencies**: Store inventory (`inventory_m_store_store1`) gates whether pickup is even
  offered on the PDP.
- **Outcomes**: Confirmation shows `Pickup Details` with store name/address/contact/hours instead
  of a shipping address, and `Shipping = $0.00`.
- **Criticality**: P0 — distinct fulfillment path with its own service dependency (store
  inventory).
- **Measurement**: Order confirms with a `Pickup Address` section; `Shipping` line is
  `Free`/`$0.00`.
- **Evidence**: Order **00291252** — _"We will send an email to cuj-pickup-20260826@outlook.com..."_,
  **Pickup Address: San Francisco Retail Store, 151 3rd St, San Francisco, CA 94103**, Order
  Summary **Subtotal $30.00 / Shipping $0.00 / Tax $1.43 / Total $30.00**.

### E3. Multi-Shipment Checkout (split delivery to two addresses)

- **User**: Guest or signed-in shopper buying multiple items for different recipients.
- **Context**: `/checkout` with 2+ cart items, `multishipEnabled=true` (live config).
- **Goal**: Ship different line items to different addresses in one order.
- **Boundaries**: Shopper Baskets shipment-splitting (`shipments/me` becomes multiple shipment
  groups) → Shopper Orders.
- **Interactions**: `Ship to multiple addresses` → per-item address selector (`Second Address`
  option) → each shipment gets its own shipping-method selection → Payment (billing address
  independent of either shipment) → Review → Place Order.
- **Branches**: Single address (E1) vs. split; each shipment can pick a different method (both
  Ground here, but priced independently).
- **Dependencies**: Two shipment sub-objects each carry their own address/method/cost, all
  reconciled into one order and one payment.
- **Outcomes**: Confirmation shows **"Delivery 1"** and **"Delivery 2"** blocks, each with its own
  address, method, and line items, summed into one `Order Total`.
- **Criticality**: P1 — gated by `multishipEnabled`, but on when present.
- **Measurement**: Confirmation page contains 2+ `Delivery N` headings; `Order Summary` groups
  items by destination.
- **Evidence**: Order **00291247** — **Delivery 1**: Test Shopper, 1 Market Street, San Francisco
  CA 94105, Ground. **Delivery 2**: Second Address, 2 Atlantic Avenue, Boston MA 02108, Ground.
  Items split correctly (Checked Silk Tie → Delivery 1, Turquoise and Gold Hoop Earring →
  Delivery 2). **Subtotal $49.99 / Shipping $21.98 (sum of $5.99 + $15.99 seen mid-flow) / Tax
  $3.44 / Total $71.97.**

### E4. Signed-in checkout (contact info pre-authenticated)

- **User**: Signed-in shopper.
- **Context**: `/checkout` while authenticated.
- **Goal**: Faster checkout using the known identity.
- **Boundaries**: Same chain as E1, but Contact Info step shows `Sign Out` instead of `Checkout as
Guest`, and the shipping form offers `Set as default` against the address book (B8).
- **Interactions**: Contact Info pre-fills the account email → Shipping Address form (still typed
  manually here; no saved address existed) → Shipping Method → Payment → Place Order.
- **Branches**: N/A beyond E1; documents the authenticated variant explicitly since it's a
  materially different Contact Info step.
- **Dependencies**: Order lands in the same `/account/orders` list used in B9, closing the loop
  from checkout to order history.
- **Outcomes**: Confirmation identical in shape to E1; the resulting order is immediately visible
  under Order History.
- **Criticality**: P0.
- **Measurement**: `Order Number` on confirmation matches the entry created in `/account/orders`.
- **Evidence**: Order **00291357**, `Signed Shopper`, confirmed present in Order History (B9)
  immediately after placement, with identical totals.

### E5. Checkout payment gaps — PayPal and Salesforce Payments (defect vs. config-off)

- **PayPal (defect)**. **User**: Any shopper preferring PayPal. **Context**: Payment step,
  `radio "paypal-icon"` alongside Credit Card. **Interactions attempted**: pointer click on the
  radio, pointer click on the PayPal icon plus `Space` key, direct DOM `element.click()` via
  `page.evaluate`. **Outcome**: `el.checked` remained `false` in every case; Credit Card stayed the
  selected method; no click ever reached the underlying `<input>` because a sibling
  `<label>`/`<div>` intercepts pointer events at that screen position. **Criticality**: P2 on a
  demo (real PayPal wouldn't process here anyway, per the store's "Orders made WILL NOT be
  processed" banner) but flagged because it silently blocks the entire PayPal path with no error
  shown to the shopper. **Evidence**: `getBoundingClientRect` confirmed the radio input is a
  1×1px visually-hidden element; `document.elementsFromPoint` at its label's coordinates returned
  only label/span/div ancestors, never the input — a genuine pointer-interception defect, not a
  flag.
- **Salesforce Payments / Express Checkout (config-off complement)**. **Boundaries**: `#mobify-data`
  config only. **Evidence**: Live config `sfPayments: {enabled: false, sdkUrl: "", metadataUrl:
""}`. No Salesforce Payments widget or express-checkout button rendered anywhere in the checkout
  flows exercised (E1–E4). This is an intentional absence, matching AGENTS.md's documented fact.
- **One-Click Checkout, first-time and returning (config-off complement)**. **Evidence**:
  `oneClickCheckout: {enabled: false}`. No one-click affordance appeared on PDP, cart, or
  confirmation screens across all checkout runs.

---

## F. Store Locator

### F1. Find nearby stores by postal code

- **User**: Any visitor.
- **Context**: Header `Store Locator` button, or the pickup drawer on PDP.
- **Goal**: Locate a physical store to shop or pick up at.
- **Boundaries**: Storefront UI → Shopper Stores `store-search` (not `stores` — `stores` takes
  explicit ids only; the wrong one answers `400 undefined-query-parameter`).
- **Interactions**: Enter/keep ZIP `94103` → `Find` → radio list of nearby stores with distance,
  contact info, hours.
- **Branches**: In-range and selectable (San Francisco: 0 km, selected by default; San Mateo: 23.83
  km, selectable) vs. out-of-threshold and disabled (Palo Alto: 90.22 km, `radio [disabled]`).
- **Dependencies**: None beyond Shopper Stores.
- **Outcomes**: 3 stores returned, correctly distance-sorted, with the far one correctly disabled
  rather than silently omitted.
- **Criticality**: P1 (feeds E2 pickup).
- **Measurement**: `store-search?...postalCode=94103...` → 200; disabled radio present for
  out-of-range stores.
- **Evidence**: `GET .../store-search?countryCode=US&distanceUnit=km&maxDistance=100&postalCode=94103&siteId=RefArchGlobal&locale=en-US&limit=200`
  → **200**. Results: San Francisco Retail Store (selected), San Mateo Retail Store (23.83 km,
  selectable), Palo Alto Retail Store (90.22 km, radio disabled).

### F2. "Use My Location" geolocation branch

- **User**: Any visitor without location sharing enabled in the automated browser context.
- **Context**: Same Find a Store drawer.
- **Goal**: Skip typing a ZIP by using device location.
- **Boundaries**: Browser Geolocation API → same `store-search` endpoint, lat/long instead of
  postal code.
- **Interactions**: Click `Use My Location`.
- **Branches**: Permission denied (this environment) vs. granted (not exercised).
- **Outcomes**: Clear inline copy — **"To use your location, enable location sharing."** — rather
  than a silent failure or crash.
- **Criticality**: P2.
- **Measurement**: Fallback copy renders instead of an unhandled error.
- **Evidence**: Denied-permission state confirmed rendering the exact fallback copy above, with the
  ZIP-based list still fully usable underneath.

---

## G. Localization

### G1. Switch storefront language

- **User**: Any visitor.
- **Context**: Footer language selector, present on every page.
- **Goal**: View the storefront in a different locale.
- **Boundaries**: Storefront UI routing (`/global/{locale}/...`) → re-render with locale-specific
  copy and currency.
- **Interactions**: Select a language from the footer combobox.
- **Branches**: Any of 11 listed locales; verified `en-US ↔ de-DE` round trip.
- **Dependencies**: `sites[0].l10n.supportedLocales` (live config) drives the option list and each
  locale's `preferredCurrency`.
- **Outcomes**: URL prefix changes (`/global/en-US/...` → `/global/de-DE/...`), page content and the
  selector itself re-render in the new language, and the trip is reversible.
- **Criticality**: P1.
- **Measurement**: URL locale segment matches selection; selector's own label translates too
  (`Select Language` → `Sprache auswählen`).
- **Evidence**: Selecting **German (Germany)** navigated to `/global/de-DE/category/gift-certificates`;
  footer selector re-rendered as **"Sprache auswählen"** with German option labels (`Englisch
(USA)`, `Deutsch (Deutschland)` selected, etc.). Selecting **Englisch (USA)** returned to
  `/global/en-US/...` cleanly. Note: the German render logged **98 console warnings** (vs. single
  digits on English pages) — flagged under Known Gaps below, not blocking.

### G2. Config-off catalogue gap — Gift Certificates category

- **User**: Any visitor clicking the persistent `Gift Certificates` nav link.
- **Context**: `/category/gift-certificates`, reachable from every page's main nav.
- **Goal**: N/A — documents a live catalogue gap distinct from a feature flag.
- **Interactions**: Click `Gift Certificates` in the header.
- **Outcomes**: Heading renders **"Gift Certificates (0)"** with body copy _"We couldn't find
  anything for Gift Certificates. Try searching for a product or Contact Us."_ — the nav entry and
  route both work; the catalogue behind it is simply empty on this demo.
- **Criticality**: P2 — worth tracking so a future non-zero count isn't mistaken for a regression,
  and a persistent zero isn't mistaken for a broken link.
- **Measurement**: Category heading count.
- **Evidence**: `GET .../categories/gift-certificates` and the corresponding `product-search` both
  returned 200; UI count is **"(0)"** both in English and confirmed the link/route itself is not a 404.

---

## H. Hybrid Continuity & Order Management (config-off complements)

### H1. PWA Kit ↔ SFRA session/basket continuity

- **Boundaries**: Direct SFRA controller routes on the same host.
- **Interactions**: Navigated directly to `Home-Show`, `Cart-Show`, `Login-Show` under
  `/on/demandware.store/Sites-RefArchGlobal-Site/en_US/...`.
- **Outcomes**: All three returned **HTTP 404** ("The page you're looking for can't be found."),
  consistent with there being no SFRA storefront co-deployed on this demo.
- **Criticality**: N/A — confirms the journey correctly gates off rather than throwing.
- **Evidence**: `GET .../Home-Show` → 404; `GET .../Cart-Show` → 404; `GET .../Login-Show` → 404.

### H2. Shipment tracking, order cancellation, order returns

- **Boundaries**: Order Management (OMS) connection via Shopper Orders' `oms`/`oms_shipments`
  expansions.
- **Interactions**: Opened order detail for a real, just-placed order (00291357) with
  `expand=oms,+oms_shipments`.
- **Outcomes**: Tracking panel renders **"Not shipped"** with no carrier/tracking-number data and
  no cancel/return affordance — consistent with OMS not being connected on this demo.
- **Criticality**: N/A — confirms the three OMS-dependent journeys correctly have nothing to act on
  rather than erroring.
- **Evidence**: `GET .../orders/00291357?expand=oms,+oms_shipments` → 200, UI Tracking section:
  **"Not shipped."** No Cancel or Return controls present anywhere in the order-detail UI.

---

## Cross-Cutting Service Dependencies & Platform Behavior

These fire on nearly _every_ page load across every journey above, so they're documented once
rather than repeated per journey:

1. **Storefront Configuration API — 403 on every page.**
   `GET .../configuration/shopper-configurations/v1/organizations/f_ecom_zzrf_001/configurations?siteId=RefArchGlobal`
   returns **403** consistently. The app tolerates this gracefully (falls back to `#mobify-data`),
   but it's a genuine live-service failure worth monitoring, not cosmetic.
2. **Shopper Context — 404 on every session.**
   `GET .../shopper-context/v1/.../shopper-context/{usid}` returns **404** for every generated
   session ID observed, guest and authenticated alike.
3. **Data Cloud web events — DNS failure.** Every page fires
   `POST https://g82wgnrvm-ywk9dggrrw8mtggy.pc-rnd.c360a.salesforce.com/web/events/{id}/` which
   fails with **`net::ERR_NAME_NOT_RESOLVED`** — the Data Cloud ingestion hostname doesn't resolve
   from this environment. Analytics/personalization signal is silently lost on every journey above.
4. **Cross-journey email-domain validation.** Both registration (B1) and guest checkout contact
   info (E1) reject `@example.com` addresses with a clear inline error, while `@outlook.com`
   addresses succeed — the same validation service backs both entry points, so a fix or regression
   in one likely affects the other.
5. **React hydration warnings under non-English locales.** The `de-DE` render produced roughly 10×
   the console warning volume of `en-US` renders on comparable pages (98 vs. single digits) — noted
   for follow-up, did not block any interaction observed.

---

## Known Defects & Gaps Observed (not modeled as CUJs)

| Area                          | Symptom                                                                                                                                          | Evidence                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| PayPal payment method         | Radio cannot be selected by pointer, keyboard, or direct DOM `.click()` — sibling element intercepts every pointer event at that position        | `el.checked` stayed `false` across 3 distinct interaction strategies; `elementsFromPoint` never returned the `<input>`                        |
| Newsletter subscribe (footer) | Clicking `Subscribe` with a valid-looking email fires **zero** network requests and shows no toast/inline confirmation or error — a silent no-op | Full `requests` log around the click showed no new POST anywhere; field simply retains its typed value                                        |
| `de-DE` locale render         | Materially higher React console warning volume than `en-US`                                                                                      | 98 new console entries vs. low single digits on comparable English pages                                                                      |
| Wishlist → Cart pickup option | An item added to cart via the wishlist's `Add to Cart` renders `Pick Up in Store` as `[disabled]` on that cart line, unlike a PDP-originated add | Cart-row snapshot immediately after the wishlist handoff showed `option "Pick Up in Store" [disabled]` in `combobox "Choose delivery option"` |

---

## Recommended Follow-Up

1. ~~Assert the wishlist **Add to Cart** control (C3) actually increments the basket and that the
   item then appears in `/cart` with correct price/quantity.~~ **Done — see C3 above and Follow-Up
   Evidence below.** Result: it's a copy, not a move; price/quantity fidelity confirmed; a
   secondary gap surfaced (pickup option disabled on a wishlist-added cart line).
2. Confirm passwordless (B3) and social (B4) _success_ paths once real inbox/IdP access is
   available — both are currently verified only on their failure branches. **Still blocked**:
   requires credentials/inbox access this environment does not have.
3. Decide whether the PayPal radio defect (E5), newsletter no-op (Known Defects), and the new
   wishlist→cart pickup-option gap (C3) warrant tickets against the storefront app versus being
   accepted as known demo limitations. **Triage decision, not a testing task** — recommend filing
   all three, since each fails silently with no shopper-visible error.

---

## Follow-Up Evidence

### C3 — Wishlist → Cart handoff (resolved 2026-08-26)

**Starting state**: signed in as `cuj-discovery-20260826@outlook.com`; cart `My cart, number of
items: 0`; wishlist `No Wishlist Items`.

**Steps and evidence**:

1. PDP `25720033M` (Gold) → `Add to Wishlist` → `POST .../customers/{id}/product-lists/{listId}/items`
   → **200**.
2. `/account/wishlist` → row rendered: `Turquoise and Gold Hoop Earring`, `Color: Gold`,
   `Quantity: 1`, `$30.00`, controls `Add to Cart` / `Remove`.
3. Clicked `Add to Cart` on that row → header cart badge changed from **`0`** to **`1`** in the
   same render → network log showed `POST .../checkout/shopper-baskets/v2/organizations/f_ecom_zzrf_001/baskets/f58548466b2937c497d73aa78d/items?siteId=RefArchGlobal&locale=en-US`
   → **200**. No new `product-lists` mutation accompanied this call — the wishlist item itself is
   left alone.
4. Re-read `/account/wishlist` immediately after: the row is **unchanged** — still
   `Quantity: 1`, `$30.00`, `Add to Cart`, `Remove` all present. **Conclusion: this is a copy
   action, not a move.**
5. Read `/cart`: heading **"Cart (1 item)"**; line item **Turquoise and Gold Hoop Earring**,
   **Color: Gold**, **Quantity: 1**, **$30.00**; **Subtotal $30.00** — matches the wishlist row
   exactly.
6. Incidental observation on the same cart-row snapshot: `combobox "Choose delivery option"`
   contained `option "Pick Up in Store" [disabled]` — an item added via the wishlist's `Add to
Cart` cannot be switched to in-store pickup from the cart the way a PDP-originated add can.
   This is now folded into C3's Outcomes above and flagged in the Recommended Follow-Up triage
   list.

**Verdict**: Follow-up item 1 is closed. The wishlist→cart handoff is cross-service (Shopper
Customers product-list read → Shopper Baskets item write) and behaves correctly for price and
quantity, with one newly-documented UX gap (pickup option unavailable on wishlist-sourced cart
lines) added to the defect list for triage.
