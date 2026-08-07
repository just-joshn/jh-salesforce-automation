# e2e — BROWSER LAYER

Chromium journeys against the storefront, organised as a Functional Page Model. 20 feature modules,
30 tests, 2 shared support helpers, 1 setup project. Each module has an API counterpart of the same
name under `api/tests/<feature>/` — same journey, same step order, no browser.

## STRUCTURE

```
setup/auth.setup.ts      # signs in once -> playwright/.auth/user.json; skips when no account
support/                 # 2 files, 19 lines total — fixtures.ts, site.ts
tests/<feature>/         # 20 modules, 4 files each = 80 files
```

## THE QUARTET (mandatory, no exceptions)

Every feature is exactly four sibling files sharing one stem:

| File              | Owns                                                    | Must not contain               |
| ----------------- | ------------------------------------------------------- | ------------------------------ |
| `<f>.locators.ts` | locator factories, one per element                      | actions, data, assertions      |
| `<f>.actions.ts`  | shopper steps; composes `Locators.x(page)`              | selectors, test data, `test()` |
| `<f>.data.ts`     | inputs, expected values, condition probes, skip reasons | selectors, `test()`            |
| `<f>.spec.ts`     | `test()` blocks + assertions                            | reusable selectors/flows/data  |

- All exports are `export const` arrow functions. Current count: **468 in `*.locators.ts`, zero
  `export function`.** Match it.
- First parameter is `page: Page`. Actions take module-typed data after it.
- Specs compose namespaces: `import * as Actions` / `import * as Locators` — all 20 specs do exactly
  this — plus named imports from `./<f>.data`.
- Navigation is an action, never inline in a spec.
- Adding a feature means adding all four files. Renaming means renaming all four.
- No page-object classes anywhere. Do not introduce one.

## WHERE TO LOOK

| Need                       | File                                                         |
| -------------------------- | ------------------------------------------------------------ |
| Shared `test` / `expect`   | `support/fixtures.ts` — 19 of 20 specs + `auth.setup.ts`     |
| Path prefixing             | `support/site.ts` — re-exports `buildPath` from `config/env` |
| Storefront feature flags   | `../api/support/app-config.ts` — `readStorefrontAppConfig`   |
| OMS gating + seeded orders | `../api/support/oms.ts` — `omsPreflight`, `readOwnedOrder`   |
| SCAPI calls from a journey | `../api/support/*` — 26 files import it (19 data, 7 actions) |

`app-config.ts` and `oms.ts` live in `api/support/` because both layers gate on them and neither
touches a browser. `buildPath` moved to `config/env.ts` for the same reason; `support/site.ts`
re-exports it so the 20 action files that import it are unchanged.

## CONVENTIONS

- **`support/fixtures.ts` is the default import**, not `@playwright/test`. It presets the `dw_dnt=0`
  consent cookie so the pop-up never interrupts a journey.
  - **One deliberate exception:** `tests/tracking-consent/tracking-consent.spec.ts` imports
    Playwright's own fixtures, because that journey must arrive with the prompt unanswered. Do not
    "fix" it to use the shared fixture.
- Locator strategy in `*.locators.ts`, by current usage: `getByRole` (216) > `getByTestId` (145) >
  `getByLabel` (71) > `getByText` (50) > `getByPlaceholder` (4). Only 2 `page.locator()` calls
  exist; do not add more. Filter for uniqueness (`getByRole('dialog').filter({ has: ... })`) rather
  than reaching for CSS.
- Conditional journeys: probe the condition in `*.data.ts`, then skip on it as the first statement
  of the test — `test.skip(!condition.met, condition.reason)`, 17 call sites. The reason names the
  exact unmet setting.
- Timeouts are inline per test: `test.setTimeout(180000)` (30 call sites), and per assertion where a
  live page is slow. Nothing global.
- Polling uses `expect.poll(...)` with an explicit timeout (3 call sites). No sleeps.
- Tests are unauthenticated by default, and `test.use` currently has **zero** call sites — no
  signed-in spec exists yet. When one is added it opts in itself via
  `test.use({ storageState: 'playwright/.auth/user.json' })` and is named `*.auth.spec.ts`; the
  `e2e-authenticated` project stays commented out in `playwright.config.ts` until that suite grows.

## ANTI-PATTERNS

- Do not put a selector in an action, a `test()` in an action, or feature data in `support/`.
- Do not add a shared factory or a generic base module. Data stays feature-local by design.
- Do not turn a store fault into a skip. Unmet condition → skip; shop that will not answer → throw.
- Do not assert placeholder demo copy (the consent form ships `Lorem ipsum`); assert that the choice
  is offered and explained.
