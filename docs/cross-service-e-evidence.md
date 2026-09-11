# Cross-Service Critical User Journeys — E. Checkout


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
