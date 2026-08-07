# PROJECT KNOWLEDGE BASE

**Generated:** 2026-08-05
**Commit:** 85d72a8
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

Centrality from the codegraph index.

| Symbol                                     | Type      | Location                    | Refs                 | Role                                              |
| ------------------------------------------ | --------- | --------------------------- | -------------------- | ------------------------------------------------- |
| `buildPath`                                | function  | `config/env.ts`             | 64                   | site/locale path prefix; every navigation         |
| `test` / `expect`                          | fixture   | `e2e/support/fixtures.ts`   | 19 files             | shared fixture; presets `dw_dnt=0` consent cookie |
| `readStorefrontAppConfig`                  | function  | `api/support/app-config.ts` | conditional journeys | app's own shipped config                          |
| `omsPreflight`                             | function  | `api/support/oms.ts`        | 4 OMS journeys x2    | credentials + seed + activation gate              |
| `shopperApiUrl` / `bearer` / `withSite`    | functions | `api/support/scapi.ts`      | cross-layer          | e2e support calls API support directly            |
| `getGuestToken` / `loginRegisteredShopper` | functions | `api/support/slas.ts`       | auth                 | SLAS + PKCE public client                         |

## CONVENTIONS

- Node 24 (`.nvmrc`, `engines`), pnpm 11.17.0. Use `pnpm`, never `npm`/`yarn`.
- Playwright does **not** typecheck. `pnpm typecheck` is a separate required gate.
- `verbatimModuleSyntax` + `consistent-type-imports`: type-only imports must say `import type`.
- `noUncheckedIndexedAccess` on — indexing yields `T | undefined`. Destructure-then-guard is the
  established pattern (`const [first] = xs; if (first === undefined) throw`).
- ESLint `complexity: max 5`, type-aware via `projectService`. Extract helpers rather than branch.
- No path aliases. Deep relative imports (`../../support/site`) are correct here.
- Prettier: single quotes, width 100.
- Env: every setting has a working public-demo default except `E2E_ACCOUNT_*` and `E2E_OMS_*`.

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
  actions are `export const` arrow functions — 461 of them, zero `export function` in
  `*.locators.ts`. Actions compose locators as `Locators.x(page)`.
- **Conditional journeys skip with a reason that names the exact unmet setting**, e.g.
  `app.oneClickCheckout.enabled`, or the SOM admin path. A skip is a statement about the deployment.
- **Store fault throws, unmet condition skips.** A shop that will not serve its own config or
  answers an unexpected status raises — a broken shop must never read as "does not apply here".
- **Conditions are proven before the browser starts**, from the app's shipped config or the commerce
  service, not inferred from what renders.
- Timeouts are per-test and inline (29 `test.setTimeout`, typically 60s–300s). No global `timeout`
  or `expect.timeout` is configured.

## COMMANDS

```bash
pnpm install && pnpm exec playwright install chromium
pnpm test              # all projects
pnpm test:e2e          # browser only      pnpm test:headed / test:ui / report
pnpm typecheck         # required; Playwright will not do it
pnpm lint              # pnpm lint:fix
pnpm format:check      # pnpm format
pnpm gen:api:fetch && pnpm gen:api    # re-vendor specs, then regenerate types
```

## NOTES

- Collection is healthy: `61 tests in 41 files` — 30 browser, 30 API, 1 auth setup. `pnpm typecheck`,
  `pnpm lint` and `pnpm format:check` all exit 0.
- **On the public demo, 7 of the 30 API tests skip, and the browser layer skips the same journeys**
  for the same reasons: no `E2E_ACCOUNT_*` credentials (login, and the 3 OMS journeys, which check
  credentials before OMS activation), `app.oneClickCheckout.enabled` off, `app.sfPayments` off plus
  `SalesforcePaymentsAllowed=false`, and `app.commerceAgent.enabled` `"false"` with every MIAW
  identifier empty. Each skip names the exact unmet setting.
- **README.md documents `e2e/tests/journeys/<feature>/`, which does not exist** — journey modules live
  directly under `e2e/tests/<feature>/`. Everything else its architecture prose describes (the API
  layer, `*.endpoints.ts`, `e2e/tests/login/`, the API coverage column) is now real.
- CI runs everything in one `pnpm test` inside the pinned `mcr.microsoft.com/playwright:v1.61.1-noble`
  container, single worker, 2 retries. Locally: 1 retry, default workers.
- Nightly `spec-drift` re-fetches upstream specs and fails if `api/specs` or `api/generated` differ
  from what is committed. It never runs on PRs — it answers "did Salesforce change", not "is this
  branch correct".
- CI workflow pins action majors that are ahead of current releases (`checkout@v7`,
  `setup-node@v7`, `upload-artifact@v7`, `pnpm/action-setup@v6`). Verify before touching CI.
- Store text is `en-US`; prefer role or `data-testid` over visible words where a label is localizable.
