# PROJECT KNOWLEDGE BASE

**Generated:** 2026-08-07
**Commit:** 2280a82
**Branch:** main

## OVERVIEW

Playwright + TypeScript test automation for a Salesforce B2C Commerce PWA Kit storefront. No
application code — tests only. Target defaults to the live public demo
`https://pwa-kit.mobify-storefront.com`, so runs place real orders and register real accounts.

## STRUCTURE

```
config/env.ts            # every env read in the repo; public-demo defaults for all but credentials
e2e/                     # browser layer (Functional Page Model) — see e2e/AGENTS.md
api/                     # SCAPI specs, generated types, request helpers, API tests — see api/AGENTS.md
scripts/*.mjs            # spec fetch + type codegen; plain Node ESM, not TypeScript
playwright.config.ts     # projects: setup -> e2e-chromium, api
```

Every journey is covered twice. `e2e/tests/<feature>/` and `api/tests/<feature>/` share a stem, a
journey and a step order; 20 modules and 30 tests on each side. The browser quartet ends in
`*.locators.ts`, the API quartet in `*.endpoints.ts`.

No `src/`. No workspaces (single private pnpm package). Depth never exceeds 3.

## WHERE TO LOOK

| Task                           | Location                               | Notes                                        |
| ------------------------------ | -------------------------------------- | -------------------------------------------- |
| Add/modify a browser journey   | `e2e/tests/<feature>/`                 | 4-file quartet; see `e2e/AGENTS.md`          |
| Add/modify an API journey      | `api/tests/<feature>/`                 | 4-file quartet; see `api/AGENTS.md`          |
| Change a URL path              | `config/env.ts`                        | `buildPath` prefixes `/<siteAlias>/<locale>` |
| Read a storefront feature flag | `api/support/app-config.ts`            | parses `#mobify-data` from the SSR page      |
| Gate on Order Management       | `api/support/oms.ts`                   | `omsPreflight`; no flag exists, state-gated  |
| Add an env var                 | `config/env.ts` **and** `.env.example` | both, or the default is invisible            |
| SCAPI auth / URLs / types      | `api/support/`                         | see `api/AGENTS.md`                          |
| CI behaviour                   | `.github/workflows/playwright.yml`     | `test` job + nightly `spec-drift` job        |

## CODE MAP

Caller counts from the codegraph index. Both layers converge on `api/support/` — that is the
architecture, not a leak.

| Symbol                    | Type     | Location                        | Callers  | Role                                              |
| ------------------------- | -------- | ------------------------------- | -------- | ------------------------------------------------- |
| `shopperApiUrl`           | function | `api/support/scapi.ts:4`        | 195      | every SCAPI URL in the repo                       |
| `withSite`                | function | `api/support/scapi.ts:9`        | 103      | `siteId` on every SCAPI call                      |
| `getGuestToken`           | function | `api/support/slas.ts:30`        | 75       | guest token; SLAS + PKCE public client            |
| `buildPath`               | function | `config/env.ts:75`              | 67       | site/locale path prefix; every navigation         |
| `loginRegisteredShopper`  | function | `api/support/slas.ts:106`       | 28       | registered sign-in; also feeds `readOwnedOrder`   |
| `env`                     | constant | `config/env.ts:4`               | 27       | the only place `process.env` is read              |
| `readStorefrontAppConfig` | function | `api/support/app-config.ts:121` | 22       | app's own shipped config; gates 4 journeys        |
| `omsPreflight`            | function | `api/support/oms.ts:153`        | 12       | credentials + seed + activation gate              |
| `customString`            | function | `api/support/scapi.ts:27`       | 11       | runtime-checked `c_` custom attribute             |
| `findNearbyStore`         | function | `api/support/stores.ts:33`      | 10       | pickup store + its inventory id                   |
| `test` / `expect`         | fixture  | `e2e/support/fixtures.ts`       | 20 files | shared fixture; presets `dw_dnt=0` consent cookie |

## CONVENTIONS

- Node 24 (`.nvmrc`, `engines`), pnpm 11.17.0. Use `pnpm`, never `npm`/`yarn`.
- Playwright does **not** typecheck. `pnpm typecheck` is a separate required gate.
- `verbatimModuleSyntax` + `consistent-type-imports`: type-only imports must say `import type`.
- `noUncheckedIndexedAccess` on — indexing yields `T | undefined`. Destructure-then-guard is the
  established pattern (`const [first] = xs; if (first === undefined) throw`).
- ESLint `complexity: max 5`, type-aware via `projectService`. Extract helpers rather than branch.
- No path aliases. Deep relative imports (`../../support/site`) are correct here.
- Prettier: single quotes, width 100, trailing commas everywhere.
- Env: every setting has a working public-demo default except `E2E_ACCOUNT_*` and `E2E_OMS_*`.
- **The suite is serial everywhere**: `fullyParallel: false` and `workers: 1` are unconditional in
  `playwright.config.ts`, not CI-only — one shared live demo store cannot take concurrency. Do not
  "restore" parallelism.
- `tsconfig.json` includes `api`, so `api/generated/` **is** typechecked even though ESLint and
  Prettier ignore it. A bad regeneration fails `pnpm typecheck`, not `pnpm lint`.

## ANTI-PATTERNS (THIS PROJECT)

- **Never hand-edit `api/specs/` or `api/generated/`.** Machine output, lint-ignored, committed.
  Regenerate. Details in `api/AGENTS.md`.
- **Never commit `.env` or `playwright/.auth/`.** Gitignored; auth state carries live cookies.
- **Never fetch or regenerate specs at test time.** The committed spec is the pin.
- `page.waitForTimeout`, `networkidle`, `force: true`, `page.waitForNavigation`: currently **zero**
  occurrences across `e2e/` and `api/`. Keep it that way — use web-first assertions and
  `expect.poll`.
- Never leave `test.only` — `forbidOnly` fails CI.
- Never reuse one guest across bonus-product promotion probes; the basket allowance runs out and the
  test flakes (`e2e/tests/bonus-product/bonus-product.data.ts:161`).
- Never treat a single live-demo flake as a product failure; a repeatable failure is real.

## UNIQUE STYLES

- **Functional Page Model.** Four sibling files per feature, no page-object classes. Locators and
  actions are `export const` arrow functions — 468 of them, zero `export function` in
  `*.locators.ts`. Actions compose locators as `Locators.x(page)`.
- **Conditional journeys skip with a reason that names the exact unmet setting**, e.g.
  `app.oneClickCheckout.enabled`, or the SOM admin path. A skip is a statement about the deployment.
- **Store fault throws, unmet condition skips.** A shop that will not serve its own config or
  answers an unexpected status raises — a broken shop must never read as "does not apply here".
- **Conditions are proven before the browser starts**, from the app's shipped config or the commerce
  service, not inferred from what renders.
- Timeouts are per-test and inline (30 `test.setTimeout` per layer, typically 60s–300s). No global
  `timeout` or `expect.timeout` is configured.
- No `test.describe` anywhere, on either layer. Specs are flat.

## COMMANDS

```bash
pnpm install && pnpm exec playwright install chromium
pnpm test              # all projects
pnpm test:e2e          # browser only      pnpm test:headed / test:ui / report
pnpm test:api          # API only, no browser
pnpm typecheck         # required; Playwright will not do it
pnpm lint              # pnpm lint:fix
pnpm format:check      # pnpm format
pnpm gen:api:fetch && pnpm gen:api    # re-vendor specs, then regenerate types
```

## NOTES

- Collection is healthy: `61 tests in 41 files` — 30 browser, 30 API, 1 auth setup. `pnpm typecheck`,
  `pnpm lint` and `pnpm format:check` all exit 0.
- `.prettierignore` does not list `.vscode`, so an untracked `.vscode/settings.json` will fail
  `pnpm format:check` even though the tracked tree is clean. Read the filename Prettier reports
  before reformatting anything.
- **On the public demo, 7 of the 30 API tests skip, and the browser layer skips the same journeys**
  for the same reasons: no `E2E_ACCOUNT_*` credentials (login, and the 3 OMS journeys, which check
  credentials before OMS activation), `app.oneClickCheckout.enabled` off, `app.sfPayments` off plus
  `SalesforcePaymentsAllowed=false`, and `app.commerceAgent.enabled` `"false"` with every MIAW
  identifier empty. Each skip names the exact unmet setting.
- **README.md carries three paths that do not exist**: `e2e/tests/journeys/<feature>/` (journey
  modules live directly under `e2e/tests/<feature>/`), `e2e/support/app-config.ts` and
  `e2e/support/oms.ts` (both moved to `api/support/`, because both layers gate on them). Everything
  else its architecture prose describes is real.
- CI runs everything in one `pnpm test` inside the pinned `mcr.microsoft.com/playwright:v1.61.1-noble`
  container. Retries are the only CI/local difference: 2 on CI, 1 locally.
- Nightly `spec-drift` re-fetches upstream specs and fails if `api/specs` or `api/generated` differ
  from what is committed. It never runs on PRs — it answers "did Salesforce change", not "is this
  branch correct".
- CI workflow pins action majors that are ahead of current releases (`checkout@v7`,
  `setup-node@v7`, `upload-artifact@v7`, `pnpm/action-setup@v6`). Verify before touching CI.
- Store text is `en-US`; prefer role or `data-testid` over visible words where a label is localizable.
