# Playwright Architecture Compliance

## Source of truth

> Page objects are for UI pages/components with 5+ interactions used in 3+ test files. Custom fixtures manage resources with setup and teardown. Helpers are stateless utilities.

This audit applies that source literally. A page/component object below either page-object threshold is removed; it is never kept for readability or padded with methods.

## Binding decisions

**D2 — classification.** Browser UI interaction belongs to a page object only when it has at least five interactions and at least three consuming spec files. Reused under-threshold UI interaction becomes a stateless helper; single-use interaction stays in its spec.

**D4 — consuming edge.** A spec consumes an object when it constructs/uses it directly, requests a fixture whose provider constructs it, or invokes a workflow that constructs it. Imports alone are not consumption. A guarded callsite inside an invoked method is an edge even when only some consumers execute the guard.

Worked derivations:
1. `CartPage` had six interactions but only `c` and `d` consuming specs, so it was removed and its reused operations became `ui/cart.ts` helpers.
2. `OrderHistoryPage` has seven interactions and consumers `b` (fixture), `e` (direct `new OrderHistoryPage(page)` in E4), and `h` (fixture), so it remains.
3. `isAddressFormBlank` is reached through checkout flows in `b`, `e`, and `h`; E2 executes its BOPIS billing branch, while b/h reach the guarded callsite without billing input.

## Page-object census

| Object | Interactions | Consuming specs | Verdict / disposition |
|---|---:|---|---|
| `LoginPage` | 12 | b, c, d, e, h | PASS |
| `RegisterPage` | 10 | b, c, d, e, h | PASS |
| `ProductPage` | 7 | b, c, d, e, h | PASS |
| `CheckoutPage` | 18 | b, e, h | PASS |
| `OrderHistoryPage` | 7 | b, e, h | PASS |
| `AccountPage` | 6 | b | VIOLATION-REMOVED; inlined in b |
| `AddressBookPage` | 5 | b | VIOLATION-REMOVED; inlined in b |
| `CartPage` | 6 | c, d | VIOLATION-REMOVED; `ui/cart.ts` |
| `WishlistPage` | 6 | c | VIOLATION-REMOVED; inlined in c |
| `ResetPasswordPage` | 4 | b | VIOLATION-REMOVED; inlined in b |
| `AddedToCartDialog` | 4 | b, d, e, h | VIOLATION-REMOVED; `ui/added-to-cart.ts` plus local interactions |
| `AddressForm` | 2 | b, e, h | VIOLATION-REMOVED; `ui/address-form.ts` |
| `ConfirmRemovalDialog` | 3 | b, c, d | VIOLATION-REMOVED; `ui/removal.ts` |
| `QuantityStepper` | 3 | c, d | VIOLATION-REMOVED; `ui/quantity-stepper.ts` |
| `StoreLocatorDialog` | 4 | e, f | VIOLATION-REMOVED; `ui/store-locator.ts` |

## Surviving file census

The audit total is rule-derived: one row for every surviving first-party Playwright-related TypeScript file, plus ten `VIOLATION-REMOVED` object rows above. Generated `api/generated/**` bindings are excluded from the reusable-test-code architecture audit.

| Area | Files | Verdict / disposition |
|---|---:|---|
| `e2e/tests/*.spec.ts` | 8 | TEST ORCHESTRATION: behavior descriptions use fixtures, page objects, and helpers |
| `e2e/quality/*` | 8 | FIXTURE / HELPER / TEST: `fixtures.ts` owns AxeBuilder lifecycle; `a11y.ts` owns stateless assertions |
| `e2e/support/pages/*` | 5 | PAGE OBJECT: all meet D2 |
| `e2e/support/ui/*` | 6 | HELPER: explicit `Page`/`Locator` parameters; no classes or mutable module state |
| `e2e/support/fixtures/*` | 2 | FIXTURE: lifecycle then chained page-object composition |
| `e2e/support/*.ts` | 5 | SUPPORT / HELPER / WORKFLOW: fixtures re-export, `site.ts` is stateless, workflows compose pages |
| `api/support/*.ts` | 16 | API CLIENT / HELPER: no browser UI interaction or lifecycle-owned browser state |
| `api/tests/*.spec.ts` | 8 | TEST ORCHESTRATION: API behavior tests |
| `support/*.ts` | 3 | CONFIGURATION / HELPER |
| `playwright.config.ts` | 1 | CONFIGURATION |
| **Surviving total** | **62** | **Census complete** |
| **Removed-object total** | **10** | **All violations individually enumerated above** |
| **Audit total** | **72** | **62 surviving files + 10 removed objects** |

## Helper consumer evidence

| Helper export group | Consumers | Verdict |
|---|---|---|
| `address-form` (`fillAddressForm`, `isAddressFormBlank`) | b, e, h | HELPER |
| `added-to-cart` (`proceedToCheckoutFromCartDialog`) | b, e, h | HELPER |
| `cart` (`gotoCart`, `expectCartItemCount`) | c, d | HELPER |
| `quantity-stepper` | c, d | HELPER |
| `removal` | b, c, d | HELPER |
| `store-locator` | e, f | HELPER |

## Fixture boundaries

- `fixtures/lifecycle.ts` owns worker accounts, authenticated contexts, pages, and teardown via `use()`/`finally`.
- `fixtures/page-objects.ts` chains `lifecycleTest.extend()` and constructs only surviving page objects.
- `fixtures.ts` is the stable public re-export surface.

## Verification

- `bun run lint`
- `bun run typecheck`
- Focused E2E: F1, D1/D2, C2, B2/B5/B6/B7/B8
- Broader E2E migration run: 28 passed
- `bun run test:a11y`: 5 passed
