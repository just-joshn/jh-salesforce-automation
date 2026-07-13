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

Running both means a failure usually points at the cause on its own: broke in the UI only, the API
only, or both.

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

| Journey                                       | Browser | API |
| --------------------------------------------- | :-----: | :-: |
| Browse a category and open a product          |    ✓    |  ✓  |
| Search and open a product                     |    ✓    |  ✓  |
| Configure a product and add it for delivery   |    ✓    |  ✓  |
| Pick a store and add a product for pickup     |    ✓    |  ✓  |
| Review and edit the cart                      |    ✓    |  ✓  |
| Guest delivery order through to confirmation  |    ✓    |  ✓  |
| Guest pickup order through to confirmation    |    ✓    |  ✓  |
| One order split across delivery and pickup    |         |  ✓  |
| Register an account                           |    ✓    |  ✓  |
| Sign in                                       |    ✓    |  ✓  |
| Order history and detail, with access control |    ✓    |  ✓  |

A few things that aren't obvious from the list:

- Checkout actually places the order. Both layers run all the way to a real confirmation and order
  number, using the demo's throwaway test data (a test card, disposable emails). The API checkout
  also proves the basket is consumed afterwards and can't be resent into a duplicate order.
- The order-history test is really an access-control test. A shopper sees their own order, a second
  shopper gets an empty list, a missing order number returns 404, and reading the first shopper's
  orders as the second one is refused.
- The `login` files have no test of their own. They hold the sign-in steps the auth setup reuses, so
  those selectors live in one place.

## Requirements

- Node 20 (what CI runs).
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

| Setting                                      | Purpose                                    | Default            |
| -------------------------------------------- | ------------------------------------------ | ------------------ |
| `E2E_BASE_URL`                               | Storefront under test                      | the live demo      |
| `E2E_SITE_ALIAS` / `E2E_LOCALE`              | Path prefix, e.g. `/global/en-US`          | `global` / `en-US` |
| `SFCC_*`                                     | SCAPI connection (non-secret, public demo) | demo values        |
| `E2E_ACCOUNT_EMAIL` / `E2E_ACCOUNT_PASSWORD` | Shopper login for the signed-in journeys   | empty (guest only) |

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

The demo's login client is public with no secret, so `api/support/slas.ts` runs the same SLAS + PKCE
flow the browser app uses, straight from Playwright's request context. One token per spec keeps it
well under the rate limit.

## Layout

```
config/
  env.ts                     # everything read from the environment
e2e/
  setup/auth.setup.ts        # logs in once, saves the session (skips with no account)
  support/
    site.ts                  # buildPath('/product/x') -> /global/en-US/product/x
    fixtures.ts              # sets the consent cookie so the pop-up never interrupts a test
  tests/
    login/                   # sign-in steps reused by auth.setup (no spec)
    <feature>/               # <feature>.{locators,actions,data,spec}.ts
api/
  support/
    slas.ts                  # guest token (SLAS + PKCE)
    scapi.ts                 # URL and header helpers
  tests/
    <feature>/               # <feature>.{endpoints,actions,data,spec}.ts
playwright.config.ts         # projects: setup, e2e-chromium, api
```

## CI

`.github/workflows/playwright.yml` runs on manual trigger and a nightly schedule only. It hits the
live site, so it deliberately doesn't run on every push or PR. Add `E2E_ACCOUNT_EMAIL` and
`E2E_ACCOUNT_PASSWORD` as repository secrets to include the signed-in journeys; without them the run
is guest only. Every run uploads its HTML report.

## Known limitations

It drives a shared, live demo store, so a slow checkout screen or a network blip can flake a run.
Retries (1 local, 2 in CI) usually absorb that, which is why CI runs nightly rather than on every
commit. One flaky run is expected; a repeatable failure isn't.

Store text is `en-US`. Where a label might change with locale I match on a role or a `data-testid`
rather than the visible words.
