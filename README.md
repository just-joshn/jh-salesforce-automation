# Salesforce Storefront Test Automation

Playwright tests in TypeScript for Salesforce PWA Kit storefronts.

The default target is the official seeded E2E deployment:

<https://scaffold-pwa-extra-features-e2e.mobify-storefront.com/>

The public demo remains an explicit read-only canary:

<https://pwa-kit.mobify-storefront.com>

## Targets

Target profiles keep endpoint and URL-shape decisions out of individual tests:

| Profile   | Base URL                                                         | URL style       | Locale  | Currency |
| --------- | ---------------------------------------------------------------- | --------------- | ------- | -------- |
| `staging` | <https://scaffold-pwa-extra-features-e2e.mobify-storefront.com/> | root            | `en-GB` | `GBP`    |
| `canary`  | <https://pwa-kit.mobify-storefront.com>                          | `/global/en-US` | `en-US` | `USD`    |

`staging` is selected by default. The canary is selected explicitly with
`E2E_TARGET=canary`. The profile's private SLAS secret remains server-side in
the storefront proxy; no saved shopper account or repository secret is needed.

### Environment variables

| Variable                       | Purpose                                                 |
| ------------------------------ | ------------------------------------------------------- |
| `E2E_TARGET`                   | `staging` (default) or `canary`                         |
| `E2E_BASE_URL`                 | Optional safe base-URL override                         |
| `E2E_PATH_STYLE`               | Optional `root` or `site-locale` override               |
| `E2E_LOCALE`                   | Profile locale (`en-GB` staging, `en-US` canary)        |
| `E2E_CURRENCY`                 | Profile currency (`GBP` staging, `USD` canary)          |
| `SFCC_ORG_ID` / `SFCC_SITE_ID` | Optional compatible Commerce target overrides           |
| `SFCC_PRIVATE_CLIENT_ID`       | Safe client identifier for the storefront private proxy |

Additional compatible-profile overrides are documented in `.env.example`.
Never put a private SLAS secret, access token, or password in a tracked file.

## Test layers

The paired journey suite has 28 browser tests and 28 browserless API tests:

- **`e2e`**: Desktop Chromium journeys using the real storefront UI and proxy.
- **`api`**: Playwright `APIRequestContext` journeys using the real storefront proxy.

The API tests cover the same journeys as the browser tests. They use the same spec-file names,
test counts, and test titles. Run this check after changing either layer:

```bash
pnpm check:title-parity
```

Together, the two paired projects run 56 tests grouped into eight areas:

| Area                       | File                                  |  Tests |
| -------------------------- | ------------------------------------- | -----: |
| A. Discovery & Browse      | `a-discovery-and-browse.spec.ts`      |      3 |
| B. Account Lifecycle       | `b-account-lifecycle.spec.ts`         |      9 |
| C. Wishlist                | `c-wishlist.spec.ts`                  |      3 |
| D. Cart                    | `d-cart.spec.ts`                      |      2 |
| E. Checkout                | `e-checkout.spec.ts`                  |      5 |
| F. Store Locator           | `f-store-locator.spec.ts`             |      2 |
| G. Localization            | `g-localization.spec.ts`              |      2 |
| H. Hybrid Continuity & OMS | `h-hybrid-continuity-and-oms.spec.ts` |      2 |
| **Total per layer**        |                                       | **28** |

Some journeys check a live boundary instead of pretending an unavailable feature works. Examples
include disabled configuration, invalid passwordless codes, blocked social login, the PayPal
radio defect, missing SFRA routes, and an inactive OMS connection.

## Test tiers and commands

```bash
pnpm check:target
pnpm test:smoke
pnpm test:e2e
pnpm test:api
pnpm test:cross-browser
pnpm test:quality
E2E_TARGET=canary pnpm test:canary
```

`@smoke` is read-only and is used for fast validation. `@destructive` marks account, basket,
wishlist, payment, and order mutations. `@nightly` marks full or expensive coverage. `@live` is
reserved for the non-destructive public canary. `@boundary` describes an expected service or
configuration boundary and is not a scheduling tier.

The dedicated quality commands are:

```bash
pnpm test:a11y
pnpm test:visual
pnpm test:visual:update
pnpm test:performance
pnpm test:security
```

Accessibility checks are strict WCAG 2A/2AA axe checks and attach rule, impact, and node evidence.
Visual snapshots cover deterministic staging states on Desktop Chromium and phone/tablet/desktop
cart breakpoints. Snapshots are generated from the pinned Linux Playwright environment and are
never updated automatically in CI. Performance checks attach navigation, LCP, CLS, and transfer
metrics against the approved staging budgets. Security checks cover deployed headers, credential
leakage, and harmless reflected-input behavior without probing unrelated hosts.

Quality checks report live deployment defects rather than suppressing them. The current staging
site has known accessibility findings; those findings remain visible until the deployment is
corrected.

## Browser projects

| Project         | Coverage                                           |
| --------------- | -------------------------------------------------- |
| `e2e`           | Full 28-journey Desktop Chromium suite             |
| `api`           | Full 28-journey `APIRequestContext` suite          |
| `e2e-firefox`   | Read-only `@smoke` Desktop Firefox checks          |
| `e2e-webkit`    | Read-only `@smoke` Desktop WebKit checks           |
| `mobile-chrome` | Read-only `@smoke` Pixel-class Chromium checks     |
| `mobile-safari` | Read-only `@smoke` iPhone-class WebKit checks      |
| `a11y`          | WCAG accessibility quality checks                  |
| `visual`        | Linux Chromium visual regression checks            |
| `performance`   | Browser performance budget checks                  |
| `security`      | Read-only deployed security-boundary checks        |
| `canary`        | JavaScript-disabled public `@live` GET-only checks |

Alternate browsers and devices run read-only smoke coverage. The full account, basket, checkout,
and order mutation matrix remains limited to the focused staging Desktop Chromium/API projects.

## Project layout

```text
README.md
playwright.config.ts

api/
  specs/       # Vendored Salesforce SCAPI OpenAPI YAML files
  generated/   # TypeScript generated from api/specs/
  support/     # API clients, fixtures, workflows, test data, and Zod schemas
  tests/       # Browserless journey specs

e2e/
  quality/     # Accessibility, visual, performance, security, and canary specs
  support/     # Pages, components, fixtures, workflows, and test data
  tests/       # Browser journey specs

scripts/
  check-target.mjs
  check-title-parity.mjs
  fetch-api-specs.mjs
  generate-api-types.mjs

.github/workflows/
  playwright-pr.yml
  playwright-nightly.yml
  storefront-canary.yml
  codeql.yml
```

### Browser tests

The E2E layer uses page objects, component objects, fixtures, and small workflow functions. Tests
say what the shopper does and assert the result. Selectors and page details stay in `e2e/support/`.

Guest journeys use a fresh page and context for each test. Signed-in journeys use one synthetic
account and authenticated context per worker, then create a fresh page for each test.

### API tests

The API layer uses Playwright request fixtures and small domain clients:

- `auth.client.ts` handles SLAS guest tokens and login flows.
- `customers.client.ts` handles accounts, addresses, wishlists, and order history.
- `baskets.client.ts` handles baskets and checkout steps.
- `orders.client.ts` handles order placement and OMS checks.
- `search.client.ts` handles suggestions and product search.
- `stores.client.ts` handles store and catalogue lookups.
- `workflows.ts` composes clients into checkout and account flows.

Normal Shopper API calls use the storefront proxy under `/mobify/proxy/api/...`. SLAS calls that
need the storefront's private client use `/mobify/slas/private/...`, matching the requests made by
the storefront. No private SLAS secret is stored in this repository.

Generated OpenAPI types give compile-time checks. Focused Zod schemas validate important runtime
response fields. The contract check is separate from the Playwright journey tests:

```bash
pnpm test:contracts
```

## Requirements and setup

- Node.js 24, also recorded in `.nvmrc`.
- pnpm 11.17.0, recorded in `package.json`.
- Internet access to the selected storefront for live tests.

Install dependencies and the browser used by the focused E2E project:

```bash
pnpm install
pnpm exec playwright install chromium
```

Install Firefox and WebKit when running the cross-browser or full nightly matrix:

```bash
pnpm exec playwright install firefox webkit
```

Copy the example environment file only when you need to change the defaults:

```bash
cp .env.example .env
```

`.env` is ignored by Git. Never put private credentials in a tracked file.

## CI tiers and reporting

Pull requests and pushes to `main` run static checks, staging API smoke, and staging Desktop
Chromium smoke. Nightly runs the full paired suites in two shards, alternate browser/device
smoke, and all dedicated quality projects. The public canary runs separately on its own schedule
and uses only `E2E_TARGET=canary`.

CI produces HTML, JUnit, GitHub annotations, and (for nightly shards) merged blob reports. HTML/JUnit
reports are retained for 14 days; blobs for 1 day; traces, screenshots, videos, and visual diffs
for 7 days. Reports never contain access tokens or private secrets.

## API specification files

The API specs are stored in `api/specs/`. They are not downloaded during a test run.

Fetch the newest published major-version-1 specs from Salesforce's public Commerce SDK repository,
then regenerate the TypeScript types:

```bash
pnpm gen:api:fetch
pnpm gen:api
```

`pnpm gen:api:fetch` needs network access. `pnpm gen:api` reads the vendored files locally. Do not
edit files in `api/generated/` by hand.

## Test data and live-site limits

The paired journeys use stable seeded products, stores, addresses, and a test card. Account,
basket, wishlist, checkout, and order journeys use unique worker-isolated data and cleanup where
the service allows it. Quality projects are read-only and do not create shopper accounts, baskets,
or orders. The JavaScript-disabled canary prevents the public storefront's normal guest bootstrap
from creating application-side guest state.

Results can change when the selected catalogue, configuration, services, or network changes. The
suite intentionally records some live limitations:

- Passwordless success needs access to the real email code.
- Social-login success needs a real external identity provider.
- Some payment and OMS features are disabled or unavailable on the staging deployment.
- A live-site failure may be an environment problem, not a code problem.

The evidence log in `docs/cross-service-critical-user-journeys.md` contains dated observations.
The executable tests and current source code are the source of truth for what runs now.

## Development checks

Before opening a change, run the focused static and contract checks plus the relevant test tier:

```bash
pnpm check:title-parity
pnpm test:contracts
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:smoke
```

Keep API and E2E test titles aligned. Keep generated API files in sync with `api/specs/`, keep
quality-only specs out of title parity, and keep secrets out of Git.
