# Playwright Architecture Compliance

## Source of truth

The linked Playwright test-architecture guidance is authoritative: CRUD, authorization, contract,
and backend edge cases belong in API tests; isolated UI behavior belongs in component tests; E2E
is reserved for cross-page navigation, session/authentication, multi-page state, third-party
iframes, real-time collaboration, and whole-stack smoke flows.

API coverage is intentionally a directional superset of browser declarations. Component-
responsibility E2E behavior is deferred until component source is available.

## Historical implementation context

The following reusable-code observations are historical repository context, not an additional
test-layer authority.

Worked derivations:
1. `CartPage` had six interactions but only `c` and `d` consuming specs, so it was removed and its reused operations became `ui/cart.ts` helpers.
2. `OrderHistoryPage` has seven interactions and consumers `b` (fixture), `e` (direct `new OrderHistoryPage(page)` in E4), and `h` (fixture), so it remains.
3. `isAddressFormBlank` is reached through checkout flows in `b`, `e`, and `h`; E2 executes its BOPIS billing branch, while b/h reach the guarded callsite without billing input.

## Per-declaration audit

Every active declaration is listed below. “Counterpart / rationale” records the paired layer or why no counterpart is required.

| Layer | Test ID / title | Primary purpose | Guidance category | Decision | Target layer | Counterpart / deferral rationale |
|---|---|---|---|---|---|---|
| E2E | A1 — Search for a product by keyword | Cross-page search journey | Whole-stack smoke | Retain | E2E | API A1 validates search contract |
| E2E | B1 — Register a new account | Registration and session | Authentication | Retain | E2E | API B1 validates mutation |
| E2E | B2 — Sign in with password (valid and invalid) | Login outcomes | Authentication | Retain | E2E | API B2 validates credentials/errors |
| E2E | B3 — Passwordless (email one-time code) login | Email-code login journey | Authentication / external service | Retain | E2E | API B3 covers boundary; inbox dependency is browser-visible |
| E2E | B4 — Social login (Google / Apple) | IdP handoff | Third-party integration | Retain | E2E | API B4 records proxy/IdP boundary |
| E2E | B5 — Reset a forgotten password (email callback) | Recovery callback | Authentication / external service | Retain | E2E | API B5 validates reset contract |
| E2E | B9 — View order history and order detail | Authenticated history navigation | Cross-page navigation | Retain | E2E | API B9 validates order payload |
| E2E | C3 — Copy a wishlist item to cart | Wishlist-to-cart journey | Multi-page state | Retain | E2E | API C3 validates state transition |
| E2E | D2 — Guest cart merges into account cart on login | Session/cart continuity | Multi-page state | Retain | E2E | API D2 validates merge |
| E2E | E1 — Guest checkout — Ship to Address | Complete purchase journey | Whole-stack smoke | Retain | E2E | API E1 validates order boundary |
| E2E | E2 — Guest checkout — Buy Online, Pick Up In Store | BOPIS purchase journey | Whole-stack smoke | Retain | E2E | API E2 validates pickup contract |
| E2E | E3 — Multi-Shipment Checkout | Split-delivery purchase | Multi-page state | Retain | E2E | API E3 validates shipment model |
| E2E | E4 — Signed-in checkout | Authenticated purchase | Session/authentication | Retain | E2E | API E4 validates signed-in order |
| E2E | G1 — Switch storefront language | Locale switch journey | Cross-page navigation | Retain | E2E | API G1 validates locale configuration |
| E2E | H2 — Shipment tracking, cancellation, and returns | OMS continuity smoke | Whole-stack smoke / external system | Retain | E2E | API H2 confirms OMS is not connected |
| API | A1 — Search for a product by keyword | Search response contract | Contract / backend edge case | Retain | API | Counterpart E2E A1 |
| API | A2 — Browse a category and refine by facet | Category/facet queries | CRUD / contract | Retain | API | E2E deferred: isolated UI |
| API | A3 — Guided Shopping Agent config-off complement | Configuration boundary | Backend edge case | Retain | API | E2E deferred: config assertion |
| API | B1 — Register a new account | Customer creation | CRUD / authorization | Retain | API | Counterpart E2E B1 |
| API | B2 — Sign in with password | Credential validation | Authentication / contract | Retain | API | Counterpart E2E B2 |
| API | B3 — Passwordless login | One-time-code boundary | Authentication | Retain | API | Counterpart E2E B3 |
| API | B4 — Social login | IdP boundary | Third-party contract | Retain | API | Counterpart E2E B4 |
| API | B5 — Reset forgotten password | Reset contract | Authentication | Retain | API | Counterpart E2E B5 |
| API | B6 — Self-service password change | Credential mutation | CRUD / authorization | Retain | E2E removed; API is authoritative |
| API | B7 — Edit profile details | Customer mutation | CRUD / authorization | Retain | E2E removed; API is authoritative |
| API | B8 — Manage saved addresses | Address CRUD | CRUD / authorization | Retain | E2E removed; API is authoritative |
| API | B9 — View order history and detail | Order reads | Contract / authorization | Retain | Counterpart E2E B9 |
| API | C1 — Add product to wishlist | Wishlist mutation | CRUD / authorization | Retain | E2E removed; API is authoritative |
| API | C2 — Remove wishlist item | Wishlist mutation | CRUD / authorization | Retain | E2E removed; API is authoritative |
| API | C3 — Copy wishlist item to cart | State transition | Contract | Retain | Counterpart E2E C3 |
| API | D1 — Add, adjust, and remove cart item | Basket CRUD | CRUD / contract | Retain | E2E removed; API is authoritative |
| API | D2 — Guest cart merges on login | Basket continuity | Authorization / state | Retain | Counterpart E2E D2 |
| API | E1 — Guest ship-to-address checkout | Order placement | Contract / backend edge case | Retain | Counterpart E2E E1 |
| API | E2 — Guest BOPIS checkout | Pickup order placement | Contract / backend edge case | Retain | Counterpart E2E E2 |
| API | E3 — Multi-shipment checkout | Shipment allocation | Contract / backend edge case | Retain | Counterpart E2E E3 |
| API | E4 — Signed-in checkout | Authenticated order | Authorization / contract | Retain | Counterpart E2E E4 |
| API | E5 — Payment gaps (PayPal, SF Payments, One-Click) | Payment configuration | Backend edge case | Retain | E2E removed; API records defect/config boundary |
| API | F1 — Find nearby stores by postal code | Store lookup | Contract | Retain | E2E removed; API is authoritative |
| API | F2 — Use My Location geolocation branch | Geolocation lookup | Backend edge case | Retain | E2E removed; API is authoritative |
| API | G1 — Switch storefront language | Locale configuration | Contract | Retain | Counterpart E2E G1 |
| API | G2 — Gift Certificates config-off gap | Configuration boundary | Backend edge case | Retain | E2E removed; API is authoritative |
| API | H1 — PWA Kit/SFRA continuity absent | Cross-system continuity | Contract / integration | Retain | E2E removed; API is authoritative |
| API | H2 — OMS tracking/cancellation/returns absent | OMS boundary | External integration | Retain | Counterpart E2E H2 |
| Quality | A11y — Home page has no WCAG violations | Automated accessibility scan | Accessibility | Retain | Quality-only; not API behavior |
| Quality | A11y — Search page has no WCAG violations | Automated accessibility scan | Accessibility | Retain | Quality-only |
| Quality | A11y — Product page has no WCAG violations | Automated accessibility scan | Accessibility | Retain | Quality-only |
| Quality | A11y — Cart page has no WCAG violations | Automated accessibility scan | Accessibility | Retain | Quality-only |
| Quality | A11y — Header search is keyboard operable | Keyboard interaction | Accessibility | Retain | Component concern; quality harness |
| Quality | Visual — Home layout | Snapshot regression | Visual quality | Retain | Quality-only |
| Quality | Visual — Search results layout | Snapshot regression | Visual quality | Retain | Quality-only |
| Quality | Visual — Product detail layout | Snapshot regression | Visual quality | Retain | Quality-only |
| Quality | Visual — Cart desktop layout | Snapshot regression | Visual quality | Retain | Quality-only |
| Quality | Visual — Cart tablet layout | Snapshot regression | Visual quality | Retain | Quality-only |
| Quality | Visual — Cart phone layout | Snapshot regression | Visual quality | Retain | Quality-only |
| Quality | Performance — Home page budget | Navigation/LCP/CLS/transfer budgets | Performance quality | Retain | Quality-only |
| Quality | Performance — Search page budget | Navigation/LCP/CLS/transfer budgets | Performance quality | Retain | Quality-only |
| Quality | Security — Required response headers | Header policy | Security quality | Retain | Quality-only |
| Quality | Security — Credentials absent from document/URLs | Secret leakage | Security quality | Retain | Quality-only |
| Quality | Security — Search reflected-XSS check | Injection defense | Security quality | Retain | Quality-only |
| Quality | Canary — Public home page | Live read-only smoke | Availability quality | Retain | Quality-only |
| Quality | Canary — Public product search | Live read-only smoke | Availability quality | Retain | Quality-only |

## Removed or deferred E2E scenarios

These declarations remain covered by API tests and are intentionally absent from the browser suite:
A2, A3, B6, B7, B8, C1, C2, D1, E5, F1, F2, G2, and H1. They test CRUD, authorization,
contract, configuration, geolocation, or backend/integration edge cases rather than journeys
requiring a browser. Isolated UI portions are deferred to component tests when component source
is available; no E2E coverage is implied by that deferral.

## Page-object, fixture, and helper evidence

| Declaration | Evidence | Verdict |
|---|---|---|
| `LoginPage`, `RegisterPage`, `ProductPage`, `CheckoutPage`, `OrderHistoryPage` | Existing browser-page abstractions used by retained E2E flows | PAGE OBJECT |
| `fixtures/lifecycle.ts` | Worker accounts, authenticated contexts, pages, teardown via `use()`/`finally` | FIXTURE |
| `fixtures/page-objects.ts` | Chains lifecycle fixture and constructs only surviving page objects | FIXTURE |
| `ui/*` helpers | Explicit `Page`/`Locator` parameters; no classes or mutable module state | HELPER |
| `api/support/*` clients | Request clients and workflows; no browser UI or lifecycle-owned browser state | API CLIENT / HELPER |
| `quality/*` fixtures and helpers | Axe, metrics, snapshots, headers, and canary assertions isolated from journeys | QUALITY HARNESS |
