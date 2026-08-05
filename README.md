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

Same journey on both layers unless noted:

| Journey                                                 | Browser | API |
| ------------------------------------------------------- | :-----: | :-: |
| Browse a category and open a product                    |    ✓    |  ✓  |
| Search and open a product                               |    ✓    |  ✓  |
| Configure a product and add it for delivery             |    ✓    |  ✓  |
| Pick a store and add a product for pickup               |    ✓    |  ✓  |
| Review and edit the cart                                |    ✓    |  ✓  |
| Guest delivery order through to confirmation            |    ✓    |  ✓  |
| Guest pickup order through to confirmation              |    ✓    |  ✓  |
| One order split across delivery and pickup              |         |  ✓  |
| Register an account                                     |    ✓    |  ✓  |
| Sign in                                                 |    ✓    |  ✓  |
| Order history and detail, with access control           |    ✓    |  ✓  |
| Discover a product from an Einstein recommendation      |    ✓    |     |
| Claim a bonus product earned by a promotion             |    ✓    |     |
| One-click checkout from saved identity data             |   ✓†    |     |
| Pay through Salesforce Payments                         |   ✓†    |     |
| Create an account after a guest purchase                |    ✓    |     |
| Track a shipment through its carrier                    |   ✓†    |     |
| Cancel an eligible Order Management order               |   ✓†    |     |
| Return eligible order items                             |   ✓†    |     |
| An un-ingested order offers no Order Management actions |    ✓    |     |
| Set tracking consent across Commerce and analytics      |    ✓    |     |
| Obtain shopping assistance from a Commerce Agent        |   ✓†    |     |
| A storefront with no Commerce Agent offers no way in    |    ✓    |     |

† Written and gated, but the public demo is not configured for it, so the run skips it with the
reason rather than executing it. See the conditional journeys below.

A few things that aren't obvious from the list:

- Checkout actually places the order. Both layers run all the way to a real confirmation and order
  number, using the demo's throwaway test data (a test card, disposable emails). The API checkout
  also proves the basket is used up afterwards and can't be sent again to make a duplicate order.
- The order-history test is really an access-control test. A shopper sees their own order, a second
  shopper gets an empty list, a missing order number returns 404, and reading the first shopper's
  orders as the second one is refused.
- The `login` files hold the sign-in steps the auth setup reuses, so those selectors live in one
  place. Its own spec asserts the same journey and skips itself when no shopper account is
  configured.
- Every journey from the Einstein recommendation down is conditional: it only exists while the store
  is configured for it, so each one proves its own condition before the browser starts and skips with
  a reason when it isn't met. The recommendation journey asks Einstein whether it has anything to
  recommend; the bonus journey puts a qualifying product in a throwaway basket and looks for the bonus
  discount line item. A store fault is raised rather than skipped, so a broken shop never reads as
  "this journey doesn't apply here".
- The three checkout journeys read their condition out of the storefront's own shipped configuration,
  which PWA Kit serializes into every page as `#mobify-data` (see `e2e/support/app-config.ts`). That
  asks the app under test what it is configured to do instead of inferring it from what renders. Each
  skip names the exact setting that isn't met, so a skip is a statement about the deployment rather
  than a shrug:
  - One-click checkout needs `app.oneClickCheckout.enabled` (which is what switches the `/checkout`
    route to the one-click page) plus `app.login.passwordless.enabled`.
  - Salesforce Payments needs both halves its own feature hook needs: locally
    `app.sfPayments.enabled` with a non-empty `sdkUrl` and `metadataUrl`, and server-side
    `SalesforcePaymentsAllowed` from the Shopper Configuration API. `expressOnCheckoutPagesEnabled`
    then decides which of PDP, mini-cart, cart and checkout the test expects an express button on.
  - Creating an account after a guest purchase needs `app.oneClickCheckout.enabled` to be **off**,
    because that is the flag the confirmation page renders its account form behind.
- On the public demo one-click checkout and Salesforce Payments are both configured off, so those two
  skip and only the guest account journey executes. Their steps are written against the deployed
  app's own contract but have never run, so treat them as unproven until a storefront configured for
  them says otherwise. Point `E2E_BASE_URL` at such a storefront and they execute with no code
  change.
- The guest account journey also proves the address deduplication the confirmation page does: it
  sends two lines to one destination, so the order carries the same delivery address on two
  shipments, and then asserts exactly one address write and exactly one saved address. The order's
  own Shopper Orders payload is what the expected values are read from, so "the form is filled in
  from the order" is a claim about the order rather than about what the test typed earlier.
- The recommendation journey also asserts the tracking, not just the tiles: the impression and the
  click are matched in both Einstein (`viewReco` / `clickReco`) and Data Cloud
  (`catalog-object-impression` keyed by the recommender). It covers both endings the journey allows,
  opening the recommended product and saving it to the wishlist.

### The tracking-consent journey

This is the one journey that must not arrive with the consent pop-up already answered, so it is the
only one that takes Playwright's own fixtures instead of the shared ones — those set `dw_dnt` up front
precisely so the form never interrupts anything else. It runs twice, once accepting and once
declining, and each run follows the choice all the way out to both analytics layers:

- The stored preference is `dw_dnt`, `0` for accepted and `1` for declined.
- The SLAS session is reauthorized to carry the same DNT, as a `refresh_token` grant rather than a
  fresh login, so it stays the same shopper's session. A session that already declares the chosen DNT
  is not reauthorized again, which is why the assertion is that the session in effect matches the
  choice rather than that an exchange always happens.
- Einstein either records the product view against the shopper's own session id or records nothing at
  all — the layer is suppressed outright rather than anonymised.
- Data Cloud keeps sending the catalog view either way, but replaces every shopper identifier with
  `__DNT__` and drops its `identity` and `partyIdentification` events when tracking is declined.

Two things about it are worth knowing, because both were found the hard way and both are what make it
stable:

- The storefront deletes a stored preference that disagrees with the DNT its current access token
  carries, and reopens the form when it does. A test that pressed the button and navigated could
  therefore lose the choice silently and still look green, so the choice is only treated as made once
  the preference and the session agree.
- The form is served rendered and stays pressable for several seconds before hydration attaches its
  handler, so an early press is dropped with no sign of it. The press repeats until the preference is
  actually stored.

The condition has two halves. The analytics layers are read from the app's own shipped configuration
before the browser starts (`app.einsteinAPI.einsteinId`, `app.dataCloudAPI.appSourceId` and
`tenantId`); whether the consent UX is still there at all can only be answered by the rendered page,
so a storefront that renders and never asks skips with that reason. The public demo has all of it, so
both runs execute. Its consent copy is the template's `Lorem ipsum` placeholder rather than a privacy
notice, so the test asserts that the choice is offered and explained without pinning the words a
merchant has to replace before launch.

### The Commerce Agent journeys

Obtaining shopping assistance is conditional on the storefront being configured for an agent at all.
The condition is read from `app.commerceAgent` in the storefront's own shipped configuration, and the
skip names every setting that isn't met. `enabled` must be exactly `"true"` — the settings are strings
parsed out of one environment variable, so `"false"` is a value the agent reads rather than an absent
one. Beyond that, which settings are required depends on the provider the storefront selects:

- `miaw`, the default, needs all of `embeddedServiceName`, `embeddedServiceEndpoint`,
  `scriptSourceUrl`, `scrt2Url`, `salesforceOrgId`, `commerceOrgId`, `siteId` and `askAgentOnSearch`.
- `commerce-client` needs `scrt2Url`, `salesforceOrgId`, one of `cc_esDeveloperName` or
  `embeddedServiceName`, and one of `cc_cdnVersion` or `commerceClientScriptSourceUrl`.

On the public demo `enabled` is `"false"` and all seven MIAW identifiers and URLs are empty, so
neither provider could initialize and the journey skips naming all of it. Its steps are written
against the deployed app's own contract but have never run — treat them as unproven until a storefront
configured for an agent says otherwise.

What that journey asserts is deliberately the storefront's own half of the contract: the provider
bundle its configuration names is requested, that provider publishes its global, Shopper
Configurations is read for the Salesforce domain the agent platform is reached on, the shopper already
holds a Commerce session, and opening the agent posts that identity to the storefront's own token
bridge (`/api/agent/identity/bridge`) for this site. The conversation window itself is the provider's
surface — an Embedded Messaging iframe, or the Commerce Client widget injected into the storefront's
container — and site, locale, currency, USID and auth type reach it through that provider's pre-chat
API. Typing into that conversation, and escalation to a human agent, are the provider's behaviour
rather than this storefront's, so they are not asserted as if they were.

The complement is the part the public demo can prove, and it is what keeps the skip honest: a
storefront with no agent configured must offer no header entry, no widget container and no ask-agent
entry beside search suggestions, must load neither provider bundle, and must hand nothing to an agent
platform. Search still returns real suggestions in that test, which is what makes the missing entry a
decision rather than a page that failed to render one. It skips in the other direction, on a
storefront that does configure an agent.

### The Order Management journeys

Tracking a shipment, cancelling an order and returning items are the three shopper actions the
storefront offers on an order that Salesforce Order Management (SOM) has ingested. They are
conditional in a different way from the checkout journeys: there is no flag to read. The storefront
gates all three purely on OMS state being attached to the order, so the only thing that turns them
on is a connected Order Management org enriching it. In the storefront's own words: "There is no
feature flag. Each action is gated entirely on data and shopper identity... B2C Commerce-only orders
(no `omsData`) never expose the return or cancel flows."

So the condition is read from the commerce service instead. `e2e/support/oms.ts` asks Shopper Orders
for the OMS metadata resource the order detail page reads its return reasons from, and a site
Order Management is not connected to answers `409 oms-not-active`. That is what each skip quotes,
naming the settings that aren't met: a SOM org linked to the B2C Commerce instance,
**Administration > Global Preferences > Salesforce Order Management Integration Administration** set
to Active, and **Merchant Tools > Site Preferences > Order > Order Management Settings > Include in
Order Management** set to Yes. Anything other than "here are the reason codes" or "OMS is not active"
raises a store fault rather than skipping.

The orders these journeys use are named by `E2E_OMS_*` rather than placed by the test, because
placing one cannot reach the states they need. A shipment only carries a carrier URL once the order
is fulfilled and a line is only returnable once it has shipped, OMS ingestion is not retroactive, and
there is no on-demand way to advance an order. Cancellation is the opposite problem: it needs an
order nothing has been allocated against yet, which a freshly placed order races. Seed the three
order numbers against an OMS-active storefront and all three execute with no code change.

A few details worth knowing:

- The tracking journey reimplements the storefront's carrier-URL hardening rather than calling it, so
  the set of tracking actions it expects is derived from the order payload on its own terms —
  otherwise the test could only assert that the page agrees with itself. It also asserts the
  filtering half: every raw URL that fails to externalize must have no matching link on the page.
- Cancellation eligibility is checked more strictly than the page checks it. The page compares
  `quantityAvailableToCancel` against `quantityOrdered` directly, so a line carrying neither field
  reads as equal and would enable a cancellation Order Management then refuses; the condition
  requires real numbers.
- The stale-quantity and unknown-item recoveries the return journey allows for are not asserted.
  Reaching them means making Order Management answer 400 with a specific error code, which can only
  be forced by faking the service the journey exists to exercise. What is asserted instead is the
  validation standing between the shopper and those failures: a quantity above the limit OMS
  currently reports cannot leave the modal.

The public demo has Order Management switched off, so all three skip. Their steps are written against
the deployed app's own contract but have never run — treat them as unproven until an OMS-active
storefront says otherwise.

The fourth journey is the complement, and the only part of this the public demo can prove: an order
Order Management has not ingested must offer none of the three actions, must ask Order Management for
nothing, and must fall back to its own ECOM status everywhere. It places a real order, reads it back
under both OMS expansions to show it carries no OMS state, then checks the page renders no actions
block, no carrier link, and the ECOM shipment state instead. It is what keeps the other three honest:
their skip says "the action is not here", and this says "and that is correct" — without it an absent
button could equally mean a broken page. It skips in the other direction, on a storefront that does
ingest into OMS and therefore has no un-ingested order to assert against.

## Requirements

- Node 24 (pinned in `.nvmrc` / `package.json` engines; the Playwright image CI runs in ships Node 24).
- pnpm (version pinned in `package.json`).

## Setup

```bash
pnpm install
pnpm exec playwright install chromium
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
pnpm test:e2e        # browser only (Chromium)
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
session to `playwright/.auth/user.json` (also gitignored). It reuses the `login` steps rather than
owning its own selectors, and skips itself when no account is configured so the guest journeys still
run.

Guest journeys run in the `e2e-chromium` project with no saved session. A signed-in test opts into
the session itself:

```ts
import { test } from '@playwright/test';
test.use({ storageState: 'playwright/.auth/user.json' });
```

I name those `*.auth.spec.ts`. A dedicated project for them is stubbed out (commented) in
`playwright.config.ts` for when that suite grows.

## API sign-in

The demo's login service (SLAS) uses a public client with no secret, so `api/support/slas.ts` can
sign in the same way the storefront does — the SLAS + PKCE flow — straight from Playwright's
request context. One token per spec keeps it well under the rate limit.

## Typed API responses

Response shapes are generated from Salesforce's own OpenAPI specs rather than hand-written, so a
field this suite reads that SCAPI does not return is a compile error instead of an `undefined` that
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

A few things worth knowing:

- `api/support/scapi-types.ts` is the only place the `components['schemas'][...]` indirection lives.
  It exports the response shapes under readable names and is where to look first.
- Names are prefixed by family where two families disagree. A basket line item (`BasketProductItem`)
  and an order line item (`OrderProductItem`) are different shapes. Order history is served by
  Shopper Customers, which declares its own `Order`, exported here as `CustomerOrder`.
- The spec marks nearly every response field optional, including ones a 200 always carries. Where a
  value feeds a later request, `required()` from `api/support/scapi.ts` narrows it and names the
  field if it really is missing, rather than passing `undefined` down the call.
- Request bodies and expected values stay in each feature's `*.data.ts`. Only response shapes are
  generated.
- Nothing fetches at test time. The committed spec is the pin; `pnpm gen:api:fetch` runs when you
  decide, or nightly in CI to detect drift.

Einstein, Data Cloud, the storefront's own `#mobify-data` config and the OMS metadata resource have
no published spec, so those stay hand-written.

## Layout

```
config/
  env.ts                     # everything read from the environment
e2e/
  setup/auth.setup.ts        # logs in once, saves the session (skips with no account)
  support/
    site.ts                  # buildPath('/product/x') -> /global/en-US/product/x
    fixtures.ts              # sets the consent cookie so the pop-up never interrupts a test
    app-config.ts            # the storefront's own shipped config, read from #mobify-data
    oms.ts                   # whether Order Management is connected, and reading a seeded order
  tests/
    login/                   # sign-in steps reused by auth.setup (spec skips without an account)
    <feature>/               # <feature>.{locators,actions,data,spec}.ts
    journeys/<feature>/      # same four files, one folder per cross-service journey
api/
  specs/                     # vendored SCAPI OpenAPI specs + MANIFEST.json (generated)
  generated/                 # types generated from those specs (generated)
  support/
    slas.ts                  # guest token (SLAS + PKCE)
    scapi.ts                 # URL and header helpers, and required()
    scapi-types.ts           # named response shapes from api/generated
    einstein.ts              # recommendation host, paths, and a recs call
  tests/
    <feature>/               # <feature>.{endpoints,actions,data,spec}.ts
scripts/
  fetch-api-specs.mjs        # pnpm gen:api:fetch
  generate-api-types.mjs     # pnpm gen:api
playwright.config.ts         # projects: setup, e2e-chromium, api
```

## CI

`.github/workflows/playwright.yml` runs on PRs into main, on pushes to main, nightly, and on manual
trigger. Add `E2E_ACCOUNT_EMAIL` and `E2E_ACCOUNT_PASSWORD` as repository secrets to include the
signed-in journeys; without them the run is guest only. Every run uploads its HTML report.

A second job, `spec-drift`, runs nightly and on demand only. It re-fetches the SCAPI specs from
upstream, regenerates the types, and fails if either differs from what is committed — so the run goes
red when Salesforce changes the contract, and the job summary names the family whose version moved.
Generation is deterministic, so a green run means nothing upstream moved rather than that the check
did nothing. It never runs on a pull request: it answers "did Salesforce change something", not "is
this branch correct".

## Known limitations

It drives a shared, live demo store, so a slow checkout screen or a network blip can flake a run.
Retries (1 local, 2 in CI) usually absorb that. One flaky run is expected; a repeatable failure
isn't.

Store text is `en-US`. Where a label might change with locale I match on a role or a `data-testid`
rather than the visible words.
