# api — SCAPI CONTRACT + CLIENT HELPERS

Salesforce Commerce API layer: vendored OpenAPI specs, types generated from them, and hand-written
request helpers. **There are no tests here** — `api/tests/` was deleted in `50bc4cf`. Everything in
this directory is consumed by the browser layer.

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
  `*.data.ts` in the browser layer.
- Einstein and Data Cloud are not SCAPI, have no published spec, and stay hand-written.

## ANTI-PATTERNS

- Never fetch or regenerate a spec at test time. The committed spec is the pin; regeneration is a
  deliberate, reviewable commit.
- Never widen a generated type by editing `generated/`. Narrow at the call site instead.
- Never reintroduce `api/tests/` without also fixing the `api` project in `playwright.config.ts` —
  it still points at that missing directory and currently exits `No tests found`.
