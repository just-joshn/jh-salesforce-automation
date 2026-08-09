# Salesforce Storefront Test Automation

Playwright tests (TypeScript) for a Salesforce composable storefront. Every shopper journey is
covered twice: once through the browser, once straight against the commerce API.

Everything runs against Salesforce's public PWA Kit demo, the "Retail React App" at
<https://pwa-kit.mobify-storefront.com/>. It's a live store, so the tests do real things: search,
browse, add to cart, register, sign in, check out, and look back at past orders.

## Two layers

Each journey is covered two ways:

- **Browser (E2E)** drives the real site in Chromium, the way a shopper would.
- **API** talks to the commerce API (SCAPI) directly, with no browser. It's faster, and it can check
  things the UI won't easily show, like a shopper being blocked from reading someone else's orders.

Running both makes a failure easy to place: broken in the UI only, in the API only, or in both.

## How it's laid out

It's a Functional Page Model. Each feature owns a few small files instead of one big page-object
class:

- `*.locators.ts` finds elements, one small function each. API features have `*.endpoints.ts`
  instead: one function per URL.
- `*.actions.ts` are the steps a shopper takes (add to cart, fill in payment). Plain functions, no
  shared state.
- `*.data.ts` holds the inputs and expected values. No page code.
- `*.spec.ts` is the test itself: it wires the other three together and makes the assertions.

Dependencies only point one way. `spec` uses `actions` and `locators`/`endpoints`; `spec` and
`actions` use `data`; nothing points back. So a selector change stays in one file and a data change
stays in another.

## What's covered

The suite is the seventeen Critical User Journeys defined in `docs/critical-user-journeys.md`. Every
journey is a module under `e2e/tests/` and a mirror under `api/tests/`, same folder name on both
layers: 34 modules, 136 files, 76 tests.

| CUJ | Module folder          | Journey                                             |
| --- | ---------------------- | --------------------------------------------------- |
| 1   | `delivery-purchase`    | Standard Delivery Purchase                          |
| 2   | `salesforce-payments`  | Standard Checkout with Salesforce Payments          |
| 3   | `express-checkout`     | Express Checkout                                    |
| 4   | `one-click-returning`  | Returning Shopper One Click Checkout                |
| 5   | `one-click-first-time` | First-Time One Click Checkout + Account Creation    |
| 6   | `store-pickup`         | Buy Online, Pick Up In Store                        |
| 7   | `multi-shipment`       | Multi-Shipment Checkout                             |
| 8   | `shopping-agent`       | Guided Shopping Agent                               |
| 9   | `registration`         | Account Registration → Authenticated Session        |
| 10  | `password-login`       | Password Login + Guest Cart Preservation            |
| 11  | `passwordless-login`   | Passwordless Login + Guest Cart Preservation        |
| 12  | `social-login`         | Social Login + Guest Cart Preservation              |
| 13  | `password-reset`       | Password Recovery via External Callback Delivery    |
| 14  | `hybrid-continuity`    | Hybrid PWA Kit ↔ SFRA Session and Basket Continuity |
| 15  | `shipment-tracking`    | Track OMS-Managed Shipment                          |
| 16  | `order-cancellation`   | Cancel Eligible OMS-Managed Order                   |
| 17  | `order-returns`        | Return Eligible OMS-Managed Items                   |

How much of that executes against the public demo depends on how the storefront is configured:

- CUJ 1, 6, 7 and 9 run end to end on both layers. Checkout actually places the order: both layers
  run to a real confirmation and order number with the demo's throwaway test data, and registration
  creates a real account.
- CUJ 10 always executes its invalid-credentials half. Its cart-preservation half needs
  `E2E_ACCOUNT_EMAIL` / `E2E_ACCOUNT_PASSWORD` on the browser layer; the API layer creates its own
  customer, so the API side runs unconditionally.
- CUJ 11 and CUJ 12 execute on the browser layer, because passwordless and social login are both
  switched on in this storefront's configuration. Only their token-entry and IdP-callback halves
  skip.
- The rest are gated: the feature is switched off on this deployment, so each one proves its own
  precondition and skips with a reason naming the exact setting that isn't met. A switched-off
  feature SKIPS; a storefront that cannot be interrogated RAISES. A skip is a statement about the
  deployment, not a shrug.

### Conditional journeys

Each gated journey reads its condition out of the storefront's own shipped configuration, which PWA
Kit serializes into every page as `#mobify-data` (see `api/support/app-config.ts`). That asks the
app under test what it is configured to do instead of inferring it from what renders:

- CUJ 2 and 3 need `app.sfPayments.enabled` with a non-empty `sdkUrl` and `metadataUrl`, plus
  server-side `SalesforcePaymentsAllowed`.
- CUJ 4 and 5 need `app.oneClickCheckout.enabled`.
- CUJ 8 needs `app.commerceAgent.enabled` to be exactly the string `"true"` — it is `"false"` here,
  and all seven MIAW identifiers are empty.
- CUJ 13 needs callback-mode recovery; this storefront's `app.login.resetPassword.mode` is
  `"email"`, and the journey document scopes itself to callback mode only.
- CUJ 14 needs an SFRA route on the same deployment. Probed live, `Home-Show`, `Cart-Show` and
  `Login-Show` all return 404.
- CUJ 15, 16 and 17 need Order Management connected. The Shopper Orders OMS metadata resource
  answers `409 oms-not-active`, and the `E2E_OMS_*_ORDER_NO` seeds are absent. The orders these
  journeys use are named by `E2E_OMS_*` rather than placed by the test, because placing one cannot
  reach the states they need: a shipment only carries a carrier URL once the order is fulfilled, a
  line is only returnable once it has shipped, OMS ingestion is not retroactive, and cancellation
  needs an order nothing has been allocated against yet, which a freshly placed order races. Seed
  the order numbers against an OMS-active storefront and they execute with no code change.

Every gated journey also ships a complement that PASSES on the demo, so an absent feature is provably
a configuration decision rather than a broken page. CUJ 8 proves no agent entry point exists and no
provider bundle loads while search suggestions still return real results, which is what makes the
missing entry a decision instead of a page that failed to render one. CUJ 15 places a real order and
proves it carries no `omsData` under both OMS expansions, which is what keeps the CUJ 16 and 17 skips
honest. CUJ 16 asserts the documented `409 oms-not-active` fault as a real contract, not merely a
skip.

Two API mirrors cannot run against this demo at all, and skip naming the exact missing credential.
CUJ 11's API mirror calls SLAS `POST /oauth2/passwordless/login`, which answers `401` without
Authorization and needs a private SLAS client secret; this demo's client is public. The browser
layer still covers the journey, because the storefront makes that call server-side with its own
credentials. CUJ 13's API mirror needs Account Manager OAuth client credentials with the
`sfcc.shopper-customers.login` scope, which this suite does not hold.

The full run (`pnpm test`, all four projects, about thirteen and a half minutes) reports
`69 passed, 44 skipped, 0 failed`. A few tests flake on the shared live store and pass on retry.

## Requirements

- Node 24 (pinned in `.nvmrc` / `package.json` engines; the Playwright image CI runs in ships Node 24).
- pnpm (version pinned in `package.json`).

## Setup

```bash
pnpm install
pnpm exec playwright install chromium webkit
cp .env.example .env   # optional, only for the signed-in journeys
```

There's a working default for everything except a real shopper login, so guest browsing and the
public API tests run with no `.env` at all. `.env` is gitignored; keep real credentials out of
anything git tracks.

| Setting                                      | Purpose                                         | Default            |
| -------------------------------------------- | ----------------------------------------------- | ------------------ |
| `E2E_BASE_URL`                               | Storefront under test                           | the live demo      |
| `E2E_SITE_ALIAS` / `E2E_LOCALE`              | Path prefix, e.g. `/global/en-US`               | `global` / `en-US` |
| `SFCC_*`                                     | SCAPI connection (non-secret, public demo)      | demo values        |
| `EINSTEIN_*` / `DATACLOUD_*`                 | Recommendation and web-event services           | demo values        |
| `E2E_ACCOUNT_EMAIL` / `E2E_ACCOUNT_PASSWORD` | Shopper login for the signed-in journeys        | empty (guest only) |
| `E2E_OMS_*_ORDER_NO`                         | Seeded orders for the Order Management journeys | empty (they skip)  |

## Running

```bash
pnpm test            # setup + browser + API
pnpm test:e2e        # browser only (Chromium and WebKit)
pnpm test:api        # API only
pnpm test:headed     # browser, visible window
pnpm test:ui         # Playwright UI runner
pnpm report          # open the last HTML report

pnpm typecheck
pnpm lint
pnpm format

pnpm gen:api:fetch  # re-vendor the SCAPI specs from upstream
pnpm gen:api        # regenerate types from the vendored specs
```

## Signing in once

The `setup` project (`e2e/setup/auth.setup.ts`) logs the shopper in a single time and saves the
session to `playwright/.auth/user.json` (also gitignored). It reuses the `password-login` steps
rather than owning its own selectors, and skips itself when no account is configured so the guest
journeys still run.

Browser projects carry no saved session. A signed-in test opts into the session itself:

```ts
import { test } from '@playwright/test';
test.use({ storageState: 'playwright/.auth/user.json' });
```

The auth file only exists when the setup project ran, so guest-only runs never reference it.

## API sign-in

The demo's login service (SLAS) uses a public client with no secret, so `api/support/slas.ts` can
sign in the same way the storefront does, over the SLAS + PKCE flow, straight from Playwright's
request context. One token per spec keeps it well under the rate limit.

## Typed API responses

Response shapes are generated from Salesforce's own OpenAPI specs instead of hand-written, so a
field this suite reads that SCAPI does not return is a compile error, not an `undefined` that
surfaces halfway through an assertion.

Salesforce publishes SCAPI as OpenAPI 3, but the download button on the docs portal needs a browser
and the Schemas API needs OAuth with the `sfcc.scapi-schemas` scope. Salesforce's own SDK repo
commits the same specs in public, so that is where `pnpm gen:api:fetch` reads them: no credentials,
and it works in CI with no secrets. The eight families this suite calls land in `api/specs/`, and
`pnpm gen:api` turns each into a module under `api/generated/`.

Both are committed. That keeps `pnpm test` a single step with no codegen in front of it, and it
makes an upstream change arrive as a reviewable diff. `api/specs/MANIFEST.json` records the resolved
version of each family, so the diff says "shopper-baskets 1.11.0 → 1.12.0" instead of showing tens
of thousands of lines of YAML.

Notes on the generated side:

- `api/support/scapi-types.ts` is the only place the `components['schemas'][...]` indirection lives.
  It exports the response shapes under readable names and is where to look first.
- Names are prefixed by family where two families disagree. A basket line item (`BasketProductItem`)
  and an order line item (`OrderProductItem`) are different shapes. Order history is served by
  Shopper Customers, which declares its own `Order`, exported here as `CustomerOrder`.
- The spec marks nearly every response field optional, including ones a 200 always carries. Where a
  value feeds a later request, `required()` from `api/support/scapi.ts` narrows it. If the field
  really is missing it throws and names it, so no `undefined` travels down the call.
- Request bodies and expected values stay in each feature's `*.data.ts`. Only response shapes are
  generated.
- Nothing fetches at test time. The committed spec is the pin; `pnpm gen:api:fetch` runs when you
  decide, or nightly in CI to detect drift.

Order Management needs no separate spec: OMS state reaches the tests through Shopper Orders' `oms`
and `oms_shipments` expansions, so `OmsShipment`, `OmsReasonCode` and `OmsMetaData` are generated
alongside `Order`, and the per-line and per-order state hangs off `omsData` on each.

The storefront's own `#mobify-data` config is not SCAPI and has no published spec, so it stays
hand-written.

## Layout

```
config/
  env.ts                     # everything read from the environment, plus buildPath()
e2e/
  setup/auth.setup.ts        # logs in once, saves the session (skips with no account)
  support/
    site.ts                  # re-exports buildPath: '/product/x' -> /global/en-US/product/x
    fixtures.ts              # sets the consent cookie so the pop-up never interrupts a test
  tests/
    password-login/          # sign-in steps reused by auth.setup
    <feature>/               # <feature>.{locators,actions,data,spec}.ts
api/
  specs/                     # vendored SCAPI OpenAPI specs + MANIFEST.json (generated)
  generated/                 # types generated from those specs (generated)
  support/                   # shared by both layers, which is why it isn't under e2e/
    slas.ts                  # guest and registered tokens (SLAS + PKCE)
    scapi.ts                 # URL and header helpers, and required()
    scapi-types.ts           # named response shapes from api/generated
    products.ts              # product, variant and inventory lookups
    stores.ts                # pickup store and its inventory id
    app-config.ts            # the storefront's own shipped config, read from #mobify-data
    gates.ts                 # skip-reason strings shared by both layers
    oms.ts                   # whether Order Management is connected, and reading a seeded order
  tests/
    <feature>/               # <feature>.{endpoints,actions,data,spec}.ts
scripts/
  fetch-api-specs.mjs        # pnpm gen:api:fetch
  generate-api-types.mjs     # pnpm gen:api
playwright.config.ts         # projects: setup, e2e-chromium, e2e-webkit, api
```

## CI

`.github/workflows/playwright.yml` runs on PRs into main, on pushes to main, nightly, and on manual
trigger. Add `E2E_ACCOUNT_EMAIL` and `E2E_ACCOUNT_PASSWORD` as repository secrets to include the
signed-in journeys; without them the run is guest only. Every run uploads its HTML report.

A second job, `spec-drift`, runs nightly and on demand only. It re-fetches the SCAPI specs from
upstream, regenerates the types, and fails if either differs from what is committed — so the run goes
red when Salesforce changes the contract, and the job summary names the family whose version moved.
Generation is deterministic, so a green run means nothing upstream moved, not that the check did
nothing. It never runs on a pull request: it answers "did Salesforce change something", not "is
this branch correct".

## Known limitations

It drives a shared, live demo store, so a slow checkout screen or a network blip can flake a run.
Retries (1 local, 2 in CI) usually absorb that. One flaky run is expected; a repeatable failure
isn't.

Store text is `en-US`. Where a label might change with locale I match on a role or a `data-testid`
rather than the visible words.
