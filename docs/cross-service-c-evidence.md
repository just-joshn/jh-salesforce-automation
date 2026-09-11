# Cross-Service Critical User Journeys — C. Wishlist


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
