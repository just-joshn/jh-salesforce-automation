# api — SCAPI CONTRACT + CLIENT HELPERS + API TESTS

Salesforce Commerce API layer: vendored OpenAPI specs, types generated from them, hand-written
request helpers, and the API test suite. `support/` is consumed by both layers.

`tests/` holds 20 feature modules, 30 tests — one module per `e2e/tests/<feature>/`, same stem, same
journey, same step order, asserted against SCAPI instead of a browser. See THE API QUARTET below.

## THE THREE-WAY SPLIT

| Directory    | Origin                                                               | Rule                                       |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------ |
| `specs/`     | vendored from `SalesforceCommerceCloud/commerce-sdk-isomorphic@main` | **never hand-edit** — `pnpm gen:api:fetch` |
| `generated/` | `openapi-typescript` output from `specs/`                            | **never hand-edit** — `pnpm gen:api`       |
| `support/`   | hand-written                                                         | edit freely                                |

Both machine directories are committed and ESLint-ignored, so nothing warns you when you edit them —
your change will be silently destroyed on the next regeneration, and nightly `spec-drift` will go
red. Regenerate instead.

`specs/MANIFEST.json` records the resolved version, source path, sha256 and byte count per family,
so an upstream bump reviews as `shopper-baskets 1.11.0 → 1.12.0` rather than tens of thousands of
YAML lines. Eight families:
auth, shopper-baskets, shopper-configurations, shopper-customers, shopper-orders, shopper-products,
shopper-search, shopper-stores.

## support/ — WHERE TO LOOK

| Need                                         | File                                           | Notes                                                   |
| -------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| Build a SCAPI URL                            | `scapi.ts` → `shopperApiUrl(family, resource)` |                                                         |
| Add `siteId` / auth header                   | `scapi.ts` → `withSite()`, `bearer(token)`     | 42 callers each                                         |
| Narrow an optional response field            | `scapi.ts` → `required(value, 'field')`        | see below                                               |
| Read a `c_`-prefixed custom attribute        | `scapi.ts` → `customString(value)`             | runtime-checked                                         |
| A response shape                             | `scapi-types.ts`                               | **the only place `components['schemas'][...]` appears** |
| Guest / registered token                     | `slas.ts`                                      | SLAS + PKCE, public client, no secret                   |
| Product, variant, inventory lookups          | `products.ts`                                  | largest helper, 526 lines                               |
| Pickup store + its inventory id              | `stores.ts`                                    |                                                         |
| Recommendations, activity + Data Cloud paths | `einstein.ts`                                  | separate host, `x-cq-client-id` header                  |
| Storefront feature flags                     | `app-config.ts` → `readStorefrontAppConfig`    | parses `#mobify-data`; both layers gate on it           |
| OMS gating + seeded orders                   | `oms.ts` → `omsPreflight`, `readOwnedOrder`    | no flag exists, state-gated; both layers gate on it     |

## CONVENTIONS

- **`required()` over `!` or `as`.** SCAPI marks nearly every response field optional, including
  ones a 200 always carries. Where a value feeds a later request, narrow it with `required()` so a
  genuinely missing field is named at the source instead of surfacing as `undefined` mid-assertion.
- **Import response types from `scapi-types.ts`, never from `generated/` directly.** That file is
  the single indirection point and gives shapes readable names.
- **Names are family-prefixed where families disagree.** `BasketProductItem` ≠ `OrderProductItem`.
  Order history comes from Shopper Customers, which declares its own `Order` — exported here as
  `CustomerOrder`. Picking the wrong one typechecks and then fails at runtime.
- Order Management has no API of its own: `OmsShipment`, `OmsReasonCode` and `OmsMetaData` arrive
  through Shopper Orders' `oms` / `oms_shipments` expansions and hang off `omsData`.
- Helpers throw with a diagnostic naming the likely cause ("the demo store's store stock has likely
  changed") rather than returning empty. A shop that cannot answer is a fault, not a negative result.
- Only response shapes are generated. Request bodies and expected values live in each feature's
  `*.data.ts` — in both layers.

## THE API QUARTET (mandatory, no exceptions)

Every `tests/<feature>/` is exactly four sibling files sharing one stem. `<f>.endpoints.ts` is this
layer's replacement for the browser layer's `<f>.locators.ts`:

| File               | Owns                                                                              | Must not contain                            |
| ------------------ | --------------------------------------------------------------------------------- | ------------------------------------------- |
| `<f>.endpoints.ts` | one URL builder per resource, via `shopperApiUrl`                                 | requests, data, assertions                  |
| `<f>.actions.ts`   | one HTTP operation per export; composes `Endpoints.x()`                           | inline URLs, test data, `test()`            |
| `<f>.data.ts`      | request bodies, expected values, response readers, condition probes, skip reasons | inline URLs in the journey itself, `test()` |
| `<f>.spec.ts`      | `test()` blocks + every assertion                                                 | reusable URLs/operations/data               |

- All exports are `export const` arrow functions. No `export function` in `tests/`.
- Actions take `(request: APIRequestContext, accessToken: string, ...)` and return `Promise<APIResponse>`.
- Specs import `{ expect, test }` from `@playwright/test` — never the browser layer's shared fixtures.
- Provisioning and condition probes may call SCAPI from `*.data.ts`; the browser layer does the same
  in 10 of its own data files. The journey's own operations still belong in `*.actions.ts`.
- **A browser-only assertion becomes the nearest API-observable claim, in the same position, with a
  comment naming the assertion it replaces.** Where nothing can substitute (a rendered iframe, a
  `window` global, a browser beacon), comment and assert nothing — never invent an endpoint.
- `page.waitForRequest` has no counterpart: here you are the caller. Assert the params you send and
  the response you got.
- Einstein and Data Cloud are not SCAPI, have no published spec, and stay hand-written.

## ANTI-PATTERNS

- Never fetch or regenerate a spec at test time. The committed spec is the pin; regeneration is a
  deliberate, reviewable commit.
- Never widen a generated type by editing `generated/`. Narrow at the call site instead.
- Never let an API module drift from its `e2e/tests/<feature>/` counterpart. They share a stem
  because they are the same journey; a step added to one belongs in both.
- Never weaken an assertion to make a conditional journey green. An unmet condition **skips** with a
  reason naming the exact unmet setting; a shop that will not answer **throws**.
