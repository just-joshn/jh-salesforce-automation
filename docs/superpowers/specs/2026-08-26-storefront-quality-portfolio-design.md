# Storefront Quality Portfolio Upgrade

**Date:** 2026-08-26  
**Status:** Approved architecture; awaiting written-spec review

## Context

The repository contains 28 Playwright browser journeys and a matching 28-test
`APIRequestContext` suite for the Salesforce PWA Kit storefront. The current
configuration targets the public `RefArchGlobal` demo at a locale-prefixed URL,
uses Desktop Chrome, and has no CI workflow or dedicated quality-gate suites.

An official deployed E2E storefront is available and is a better default target
for repeatable checks:

- URL: `https://scaffold-pwa-extra-features-e2e.mobify-storefront.com/`
- Organization: `f_ecom_zzrf_001`
- Site: `RefArchGlobal`
- Root URL routing (`/`, not `/global/en-US`)
- Private SLAS proxy enabled
- Seeded store-locator data
- Passwordless and social-login configuration enabled

The existing public demo remains useful as a non-destructive canary. It is not a
replacement for a deterministic local application because this repository contains
test automation, not storefront application source.

## Goals

1. Make the official E2E storefront the default shared test environment.
2. Preserve the public demo as an explicit canary target.
3. Add explicit test tiers and CI workflows with fast PR feedback and complete
   scheduled coverage.
4. Expand browser/device coverage without multiplying expensive destructive runs.
5. Add accessibility, visual, performance, and security gates that use real
   application-to-backend traffic.
6. Make environment drift, artifacts, and failures diagnosable.
7. Keep the existing E2E architecture and additive API coverage intact.

## Non-goals

- Building or containerizing the storefront application; its source is not in
  this repository.
- Mocking Salesforce Shopper APIs, the storefront proxy, or other application
  frontend-to-backend communication.
- Running real payment, email, or external identity-provider success flows.
- Treating browser mobile emulation as native Android or iOS application testing.
- Adding a large custom dashboard or external metrics service.
- Hiding unavailable live features with skips or unconditional mocks.

## Design decisions

### 1. Environment profiles

Add a small, typed target-profile layer with two named profiles:

| Profile   | Purpose                    | URL shape       | Commerce target                                             |
| --------- | -------------------------- | --------------- | ----------------------------------------------------------- |
| `staging` | Default PR/nightly target  | Root (`/`)      | org `f_ecom_zzrf_001`, site `RefArchGlobal`, locale `en-GB` |
| `canary`  | Explicit public-demo check | `/global/en-US` | org `f_ecom_zzrf_001`, site `RefArchGlobal`, locale `en-US` |

The staging locale is `en-GB` because the deployed `RefArchGlobal` configuration
advertises it as its default supported locale. The canary retains the current
public-demo locale. Profile values are safe configuration values; the private
SLAS secret remains server-side and is never added to the repository or CI.

`E2E_TARGET` selects the profile and defaults to `staging`. Explicit environment
variables continue to override profile values so a developer or CI job can point
the suite at another compatible deployment. The resolver exposes:

- base URL and path style;
- locale, organization, site, short code, and client identifiers;
- a normalized `storefrontUrl(path)` helper;
- a target label for reports and diagnostics.

The API and E2E helpers use this same path behavior. Root targets produce `/` or
`/cart`; locale-prefixed targets produce `/global/en-US` or
`/global/en-US/cart`. No caller concatenates the profile prefix directly.

A preflight command fetches the target root document and validates the shipped
`mobify-data` configuration before destructive suites run. It checks the expected
organization/site, supported locale, private SLAS route, and required seeded
store capability. A mismatch fails with an actionable message rather than
turning into a collection of misleading test failures.

The staging target is shared seeded infrastructure, not an isolated database.
Existing worker-scoped account creation, unique test emails, bounded polling, and
cleanup remain mandatory. Stable products and stores are read from the target's
known fixture data; tests do not share mutable shopper accounts.

### 2. Test tiers and annotations

Keep feature tags such as `@checkout`, `@account`, and `@boundary`. Add explicit
pipeline tags using Playwright details metadata:

| Tag            | Meaning                                                 | Allowed behavior                                                      |
| -------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| `@smoke`       | Fast read-only confidence path                          | Safe for every PR and alternate browser/device projects               |
| `@destructive` | Creates or mutates shopper data, baskets, or orders     | Staging/nightly only unless specifically selected                     |
| `@nightly`     | Full or expensive regression/quality coverage           | Scheduled and manually dispatched runs                                |
| `@live`        | Deliberately exercises an external live boundary/canary | Read-only canary workflow; expected boundary statuses remain explicit |

`@boundary` remains a semantic label for an expected service/configuration
boundary and is not itself a pipeline tier. Tests may have at most the relevant
feature tag plus the relevant pipeline tags. Existing title parity remains
mandatory for the 28 E2E/API journey pairs; quality-only tests do not enter that
pairing.

The PR gate runs static checks, contracts, parity, and the `@smoke` API and
Chromium E2E subsets. Nightly runs the complete paired suites and all dedicated
quality projects. The public canary selects only non-destructive `@live` checks.

### 3. Playwright projects and browser coverage

Retain the existing project names and behavior:

- `e2e`: full paired browser journeys on Desktop Chrome;
- `api`: browserless paired journeys through `APIRequestContext`.

Add these focused projects:

- `e2e-firefox`: Desktop Firefox `@smoke` checks;
- `e2e-webkit`: Desktop WebKit `@smoke` checks;
- `mobile-chrome`: Pixel-class Chromium emulation, `@smoke` checks;
- `mobile-safari`: iPhone-class WebKit emulation, `@smoke` checks;
- `a11y`: dedicated accessibility specs on Desktop Chromium;
- `visual`: dedicated visual specs on Desktop Chromium only;
- `performance`: dedicated performance specs on Desktop Chromium;
- `security`: dedicated security specs on Desktop Chromium.

Alternate browsers and devices run read-only smoke coverage rather than the
entire account/cart/checkout mutation matrix. This gives meaningful rendering
and responsive coverage without multiplying shared-environment orders. Visual
snapshots are generated and compared on one pinned Linux Chromium environment;
separate browser snapshots are not created unless a demonstrated rendering
requirement justifies them.

### 4. Accessibility coverage

Add `@axe-core/playwright` as a development dependency and a focused `a11y`
fixture that configures WCAG 2A/2AA analysis. The suite covers stable staging
states for the home page, search/results, a product page, and the cart, plus
keyboard checks for primary navigation/search and modal focus behavior where the
existing UI exposes those controls.

Assertions fail on reported violations and include rule, impact, and node HTML in
the failure message. No blanket rule exclusions are introduced. If a third-party
widget must be excluded, the exclusion is narrow, documented in the test, and
not allowed to hide application-owned markup.

### 5. Visual coverage

Add a `visual` spec for a small set of high-value, deterministic staging states:

- home page;
- search/results page;
- product detail page;
- cart page at phone, tablet, and desktop breakpoints.

Functional assertions remain the source of behavioral truth. Screenshots use
role/test-id-driven readiness, disabled animations, masks for volatile content,
and a small documented pixel tolerance. Dynamic account, order, payment, and
third-party widget states are excluded from the baseline set.

Baselines are generated on the same pinned Linux/Playwright environment used by
CI. Snapshot updates are an explicit command/review step; CI never updates
snapshots automatically. Unexpected diffs fail and upload the expected, actual,
and diff artifacts.

### 6. Performance coverage

Add a lightweight browser performance project rather than introducing Lighthouse
or a hosted metrics service. Tests collect navigation timing, buffered LCP/CLS
when available, and resource transfer totals after observed page readiness. They
attach the measured JSON to the Playwright report and assert the following
staging budgets:

| Page           |     TTFB | DOM content loaded |      LCP |  CLS | transferred bytes |
| -------------- | -------: | -----------------: | -------: | ---: | ----------------: |
| Home           | 1,500 ms |           5,000 ms | 4,000 ms | 0.25 |             6 MiB |
| Search/results | 1,500 ms |           6,000 ms | 4,500 ms | 0.25 |             7 MiB |

The tests use condition-based waits and do not use arbitrary sleeps or
`networkidle` as a readiness contract. A missing required metric is reported as
an instrumentation failure; transient network failures remain visible rather
than being converted into passing results. Budgets are intentionally generous
for a shared remote target and can only change with recorded measurements and a
reviewed rationale.

### 7. Security coverage

Add a read-only security project against staging that verifies the deployed
boundary rather than pretending to scan application source. Checks include:

- HTTPS and HSTS;
- `Content-Security-Policy` with restrictive baseline directives;
- `X-Frame-Options`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy`;
- absence of the private SLAS secret in the root document and observed request
  URLs;
- harmless reflected-input/XSS probes through the real search route, with alert
  detection and escaped-content assertions.

The tests do not submit destructive payloads, probe unrelated hosts, or mock the
application's own API. Third-party scripts may be blocked only where doing so is
necessary to isolate a third-party boundary; the application proxy and SCAPI
requests remain real.

### 8. CI workflows

Use GitHub Actions because the repository is hosted on GitHub. Use Node 24 and
pnpm 11.17.0 from the repository's declared engine/package-manager settings,
install with `pnpm install --frozen-lockfile`, and install only the browsers
needed by each job.

#### Pull requests and main pushes

A fast workflow runs on pull requests and pushes to `main`:

1. install dependencies;
2. run typecheck, ESLint, formatting check, contract tests, and title parity;
3. run staging API `@smoke`;
4. run staging Chromium E2E `@smoke`;
5. upload reports and failure artifacts.

No credentials are required for the selected public deployment profiles. The
workflow uses concurrency cancellation for superseded pull requests and does
not cancel the independent jobs needed to diagnose a failed matrix.

#### Nightly and manual regression

A scheduled/manual workflow runs:

- full staging API and Desktop Chrome suites;
- Firefox, WebKit, mobile Chrome, and mobile Safari smoke projects;
- accessibility, visual, performance, and security projects;
- fixed two-way sharding for the full paired suites when the measured run time
  justifies it.

The shard count remains deliberately small for the current suite. It may grow
only after test count/runtime evidence shows that setup cost is outweighed by
parallel execution.

#### Public canary

A separate scheduled/manual workflow selects `E2E_TARGET=canary` and runs only
read-only `@live` checks. It reports public-demo drift independently of staging
regression and never creates accounts, baskets, or orders.

### 9. Reporting and artifacts

Local runs retain list output and an HTML report. CI runs use dot output, GitHub
annotations, JUnit XML, and Playwright blob reports. Sharded blobs are merged
into one HTML report.

Upload policy:

- merged HTML report and JUnit: always unless the job is cancelled, 14-day
  retention;
- blob reports: always for shard jobs, 1-day retention;
- traces, screenshots, videos, and visual diffs: on failure, 7-day retention.

The report metadata includes the target profile, base URL, locale, project, shard,
commit, and Playwright version. Private tokens, authorization headers, and
secrets are never attached or printed.

## Data flow and failure handling

1. CI or a developer selects `E2E_TARGET` and optional safe overrides.
2. The profile resolver produces one target contract used by Playwright config,
   API clients, E2E navigation, preflight, and report metadata.
3. Preflight validates the root SSR config and required target capabilities.
4. Tests create isolated worker/test data and call the real storefront proxy and
   Shopper APIs.
5. Third-party-only boundaries are blocked or mocked in dedicated tests; owned
   application traffic is never mocked.
6. Status-first API assertions and focused Zod parsing preserve useful failure
   output.
7. CI retries only in CI, captures diagnostics, and fails expected-contract
   mismatches honestly.

A target capability mismatch is a preflight failure. An expected live boundary
such as a disabled feature or inactive OMS response remains an executable,
status-specific assertion. Neither case is silently skipped.

## Verification criteria

The implementation is complete when:

- staging is the default profile and the public demo is opt-in canary;
- root and locale-prefixed URL styles both work through shared navigation/config
  helpers;
- all existing 28 API and 28 E2E journey titles remain paired;
- PR and nightly workflows run with frozen pnpm installs and no private secrets;
- the full staging API/E2E suites pass or report target-specific, reproducible
  defects with evidence;
- alternate browser/device smoke projects execute successfully;
- accessibility, visual, performance, and security projects produce their
  documented artifacts and enforce their gates;
- sharded reports merge correctly and failure artifacts are downloadable;
- typecheck, lint, formatting, contracts, parity, and `git diff --check` pass;
- README and environment documentation describe the new commands, profiles,
  tiers, artifacts, and canary policy.

## Implementation boundary

The next implementation plan will separate environment/profile plumbing, test
annotations/projects, quality specs, CI workflows, reporting, and documentation
into reviewable steps. It will not alter the existing domain-client interfaces
or replace real storefront API traffic with fixtures.
