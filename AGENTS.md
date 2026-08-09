# Repository guide

Playwright suite covering the seventeen journeys in `docs/critical-user-journeys.md` against the
Salesforce PWA Kit public demo at <https://pwa-kit.mobify-storefront.com>. That document is the
specification; this file is how the code is built.

Two layers cover the same journeys: a browser layer under `e2e/tests/`, and an API layer under
`api/tests/` that talks to SCAPI directly. Same journey, same assertions in spirit, requests instead
of clicks.

## Commands

```bash
pnpm typecheck      # tsc --noEmit — Playwright transforms TypeScript but never typechecks it
pnpm lint           # eslint . — type-aware, complexity capped at 5
pnpm format:check
pnpm test           # setup + e2e-chromium + e2e-webkit + api
pnpm test:e2e       # both browser projects
pnpm test:api
```

## Layout

```
config/env.ts            every environment value, plus buildPath()
e2e/support/site.ts      re-exports buildPath for the browser layer
e2e/support/fixtures.ts  shared test/expect; suppresses the consent pop-up
e2e/setup/auth.setup.ts  signs in once, writes playwright/.auth/user.json
e2e/tests/<feature>/     <feature>.{locators,actions,data,spec}.ts
api/support/             shared by BOTH layers, which is why it is not under e2e/
api/tests/<feature>/     <feature>.{endpoints,actions,data,spec}.ts
api/specs/, api/generated/   vendored SCAPI OpenAPI specs and the types generated from them
```

## Functional Page Model

Every test module is four sibling files in one folder. All four are required; none may be merged or
omitted because it looks thin.

- `.locators.ts` (browser) / `.endpoints.ts` (API) — locator factories, or one function per URL.
  Take `page: Page` first. Return a `Locator`. They never act and never assert. Every selector in the
  module lives here.
- `.actions.ts` — exported async functions expressing shopper behaviour. They compose locators or
  endpoints through namespace access. Stateless and functional: no class, no `this`, no module state,
  no inline selectors, no inline data.
- `.data.ts` — typed inputs, expected values, and the module's exported input type. Data
  transformations belong here too. No selectors, no browser work, no assertions.
- `.spec.ts` — the only file containing `test()`. Wires the other three and holds the assertions.
  Navigation happens through an action, never inline.

`playwright.config.ts`, the setup project and shared fixtures are infrastructure, exempt from the
quartet. Feature-specific logic must not hide there.

Validate the quartet across every module — each folder must hold exactly four files, and `test(`
must appear only in specs:

```bash
for d in e2e/tests/*/ api/tests/*/; do
  n=$(basename "$d"); c=$(ls "$d" | wc -l | tr -d ' ')
  [ "$c" = 4 ] || echo "$n: $c files, expected 4"
done
grep -rl 'test(' --include='*.ts' e2e/tests api/tests | grep -v '\.spec\.ts$'
```

## Conventions

`config/env.ts` exports `env` with UPPERCASE keys matching `.env.example` one-to-one — `env.SFCC_ORG_ID`,
`env.E2E_ACCOUNT_EMAIL`. Optional values normalise empty strings to `undefined`.

`buildPath('/product/x')` returns `/global/en-US/product/x`. The browser layer imports it from
`e2e/support/site.ts`, never from `config/` directly.

Specs import `test` and `expect` from `e2e/support/fixtures.ts`, not from `@playwright/test`. The
fixture seeds the consent cookie before the first navigation, so the pop-up never interrupts a
journey. Seeing that pop-up in a test means the import is wrong.

Browser projects carry no `storageState`. Signed-in specs opt in with `test.use({ storageState })`,
because the auth file does not exist on a guest-only run.

## Banned

Audit-enforced across the suite:

- `page.waitForTimeout()`, `waitForLoadState('networkidle')`, `waitUntil: 'networkidle'`
- `page.waitForNavigation()` — use `page.waitForURL()`
- `force: true`
- `page.$`, `page.$$`, `page.waitForSelector`, `ElementHandle`
- `expect(await locator.isVisible()).toBe(true)` — use awaited web-first matchers
- a floating `expect` with no `await`
- `describe.serial` and any ordering coupling between tests
- `any`, `as any`, `@ts-ignore`, `@ts-expect-error`
- mocking SCAPI. It is the system under test. Routing genuinely third-party dependencies is fine.

Locator priority: `getByRole`, then `getByLabel` / `getByPlaceholder` / `getByText` / `getByAltText` /
`getByTitle`, then `getByTestId`. A raw CSS or XPath selector needs a written reason.

ESLint caps cyclomatic complexity at 5. Optional chaining and `??` count toward it. Decompose into
small named helpers rather than loosening the rule.

## Conditional journeys

Ten journeys depend on how the storefront is configured. Each proves its own precondition and, when
unmet, skips with a reason naming the exact settings that are not satisfied. Both layers must produce
the identical reason, which is why the strings live in `api/support/gates.ts` rather than in specs.

The distinction that matters: a feature that is switched off SKIPS. A storefront that cannot be
interrogated RAISES. `api/support/app-config.ts` throws when the configuration is unreadable, and
that throw must never be caught and converted into a skip — otherwise a broken storefront becomes
indistinguishable from a correctly-unconfigured one and journeys silently pass by not running.

Where a gated journey has a complement the demo _can_ prove, write it. "The agent entry point is
absent" plus "search suggestions still work" together show the absence is a decision rather than a
page that failed to render.

## Verified storefront facts

Read live from `<script id="mobify-data">` on the demo. Re-read rather than trusting this list.

| Setting                                   | Value                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `login.passwordless`                      | enabled `true`, mode `email`, landing `/passwordless-login-landing`    |
| `login.social`                            | enabled `true`, idps `["google","apple"]`, redirect `/social-callback` |
| `login.resetPassword.mode`                | `email` — so the callback-only reset journey gates                     |
| `oneClickCheckout.enabled`                | `false`                                                                |
| `sfPayments`                              | enabled `false`, `sdkUrl` and `metadataUrl` empty                      |
| `commerceAgent.enabled`                   | the STRING `"false"` — compare exactly, never by truthiness            |
| `multishipEnabled`, `storeLocatorEnabled` | both `true`                                                            |

No express-checkout key ships in the configuration; that gate derives from Salesforce Payments.
Order Management is not connected: the metadata probe answers `409` with an `oms-not-active` fault.

Login flow: `My Account` opens a modal, then email, then `Password`, then the password field, then
`Sign In`. Success lands on `/account` with an `Open account menu` button. Failure renders a
`role=alert`.

## SCAPI gotchas

Each cost real debugging time. All four were live-verified.

- **Product search needs a refinement, not an empty query.** `q: ''` returns HTTP 200 with no `hits`
  field at all. Use `refine=cgid=root` to browse the whole catalogue. Guard with `?? []` regardless.
- **`expand` replaces the defaults.** Every expansion applies only when no `expand` is supplied, so
  `expand=availability` silently drops `variations` and leaves `variationAttributes` empty. Ask for
  everything you need: `availability,variations`.
- **Stores: `store-search`, not `stores`.** `stores` takes explicit ids; only `store-search` accepts
  latitude/longitude, and the wrong one answers `400 undefined-query-parameter`.
- **Nearly every response field is optional in the spec,** including ones a 200 always carries. Use
  `required()` from `api/support/scapi.ts` where a value feeds a later request so a gap throws naming
  itself. Do not use it where absence is legitimate — a standalone product has no variants.

## Playwright API rules

- A non-2xx does **not** throw by default. Check `status()` explicitly.
- Synchronous, never awaited: `status()`, `ok()`, `statusText()`, `headers()`, `headersArray()`,
  `url()`, `timing()`.
- Asynchronous, always awaited: `json()`, `text()`, `body()`, `dispose()`, `storageState()`.
- `ok()` means 200–299. Assert `status()` when an exact code matters.
- `maxRetries` retries `ECONNRESET` only, never HTTP statuses.
- The built-in `request` fixture is an isolated context. `page.request` shares browser cookies. They
  are not interchangeable.
- `method` is an option of `fetch()` only, never of `get`/`post`/`put`/`patch`/`delete`/`head`.

## Verifying a support module

`node /tmp/script.ts` does **not** work — the sources use extensionless imports that Node's native
TypeScript runner rejects. Write a throwaway spec instead, run it, then delete it:

```bash
pnpm exec playwright test api/tests/_tmp-x --project=api --reporter=list
```

## Live store etiquette

This is a shared public demo. The suite runs one worker. Checkout journeys place real orders and
registration creates real accounts, using throwaway data — that is intended, and it is the only way
to prove a journey reaches a confirmed order.

Never hardcode a product, variant, size, category or store id. Stock runs out and products get
discontinued; a suite pinned to one of them fails for reasons unrelated to the code under test.
Resolve them at run time through `api/support/products.ts` and `api/support/stores.ts`.

`playwright/.auth/` is gitignored and must never be committed.
