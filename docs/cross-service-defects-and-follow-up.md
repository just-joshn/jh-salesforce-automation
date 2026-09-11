# Cross-Service Defects and Follow-Up Records

| Area                          | Symptom                                                                                                                                          | Evidence                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| PayPal payment method         | Radio cannot be selected by pointer, keyboard, or direct DOM `.click()` — sibling element intercepts every pointer event at that position        | `el.checked` stayed `false` across 3 distinct interaction strategies; `elementsFromPoint` never returned the `<input>`                        |
| Newsletter subscribe (footer) | Clicking `Subscribe` with a valid-looking email fires **zero** network requests and shows no toast/inline confirmation or error — a silent no-op | Full `requests` log around the click showed no new POST anywhere; field simply retains its typed value                                        |
| `de-DE` locale render         | Materially higher React console warning volume than `en-US`                                                                                      | 98 new console entries vs. low single digits on comparable English pages                                                                      |
| Wishlist → Cart pickup option | An item added to cart via the wishlist's `Add to Cart` renders `Pick Up in Store` as `[disabled]` on that cart line, unlike a PDP-originated add | Cart-row snapshot immediately after the wishlist handoff showed `option "Pick Up in Store" [disabled]` in `combobox "Choose delivery option"` |

---

## Recommended Follow-Up

1. ~~Assert the wishlist **Add to Cart** control (C3) actually increments the basket and that the
   item then appears in `/cart` with correct price/quantity.~~ **Done — see [C3 journey evidence](cross-service-c-evidence.md#c3-copy-a-wishlist-item-to-cart) and the
   canonical record below.** Result: it's a copy, not a move; price/quantity fidelity confirmed; a
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

The canonical reproduction, request/response evidence, and pickup limitation are maintained in
[`cross-service-c-evidence.md`](cross-service-c-evidence.md). This ledger records the final
triage state only: the copy handoff is resolved, while the disabled pickup option remains a
product follow-up.
