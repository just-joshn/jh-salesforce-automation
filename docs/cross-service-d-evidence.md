# Cross-Service Critical User Journeys — D. Cart


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
