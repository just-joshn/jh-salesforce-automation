# Storefront Environment and Test-Tier Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the official seeded E2E storefront the default target, preserve the public demo as a canary, and give every paired journey an explicit execution tier.

**Architecture:** A small shared target module owns profile values, URL construction, locale, and currency. The existing API and E2E support modules consume that contract without changing their domain-client interfaces. Pipeline tags remain Playwright metadata on the existing paired specs, while destructive data isolation and live-boundary assertions stay unchanged.

**Tech Stack:** TypeScript 5.9, Node.js 24, pnpm 11.17.0, Playwright 1.62.1, Zod 4.

**Spec:** `docs/superpowers/specs/2026-08-26-storefront-quality-portfolio-design.md`

## Global Constraints

- The `staging` profile defaults to `https://scaffold-pwa-extra-features-e2e.mobify-storefront.com/`, organization `f_ecom_zzrf_001`, site `RefArchGlobal`, locale `en-GB`, and currency `GBP`.
- The `canary` profile targets `https://pwa-kit.mobify-storefront.com`, organization `f_ecom_zzrf_001`, site `RefArchGlobal`, locale `en-US`, and currency `USD`.
- The staging target is shared seeded infrastructure, not an isolated database; unique accounts, worker isolation, bounded polling, and cleanup remain mandatory.
- Never store or print a private SLAS secret; the literal proxy placeholder is the only private-client value sent by tests.
- Never mock Salesforce Shopper APIs, the storefront proxy, or application frontend-to-backend communication.
- Use status-first assertions, response parsing, condition-based waits, and no arbitrary sleeps or `networkidle` readiness contracts.
- Keep the existing 28 E2E/API title pairing and run `pnpm check:title-parity` after paired-spec changes.
- Keep generated files under `api/generated/` unchanged by hand.
- CI uses retries only when `CI` is set; local runs keep retries at zero.
- New pipeline tags use Playwright details metadata, not test-title suffixes.

---

### Task 1: Add the typed target-profile resolver

**Files:**

- Create: `support/targets.ts`
- Create: `support/targets.test.ts`
- Modify: `tsconfig.json: include`
- Modify: `package.json: scripts`

**Interfaces:**

- Produces `TargetName`, `PathStyle`, `StorefrontTarget`, `targetProfiles`, `resolveTarget(input?)`, `storefrontPath(target, path?)`, and `storefrontUrl(target, path?)`.
- `StorefrontTarget` fields are `name`, `label`, `baseURL`, `pathStyle`, `siteAlias`, `locale`, `currency`, `shortCode`, `orgId`, `siteId`, `publicClientId`, and `privateClientId`.
- `resolveTarget` reads `E2E_TARGET` and safe `E2E_*`/`SFCC_*` overrides from a `NodeJS.ProcessEnv` argument, which makes profile behavior unit-testable without mutating process state.

- [ ] **Step 1: Write the failing resolver tests**

Create `support/targets.test.ts` with the exact profile and path assertions below:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveTarget, storefrontPath, storefrontUrl } from './targets.ts';

describe('target profiles', () => {
  it('defaults to the staging profile', () => {
    const target = resolveTarget({});

    assert.equal(target.name, 'staging');
    assert.equal(target.baseURL, 'https://scaffold-pwa-extra-features-e2e.mobify-storefront.com');
    assert.equal(target.pathStyle, 'root');
    assert.equal(target.locale, 'en-GB');
    assert.equal(target.currency, 'GBP');
    assert.equal(target.orgId, 'f_ecom_zzrf_001');
    assert.equal(target.siteId, 'RefArchGlobal');
    assert.equal(target.privateClientId, '475ad705-e2c1-4808-af78-81661f754511');
  });

  it('builds root-style staging paths', () => {
    const target = resolveTarget({});

    assert.equal(storefrontPath(target), '/');
    assert.equal(storefrontPath(target, '/cart'), '/cart');
    assert.equal(
      storefrontUrl(target, '/search?q=tie'),
      'https://scaffold-pwa-extra-features-e2e.mobify-storefront.com/search?q=tie',
    );
  });

  it('selects the public demo canary profile', () => {
    const target = resolveTarget({ E2E_TARGET: 'canary' });

    assert.equal(target.name, 'canary');
    assert.equal(target.pathStyle, 'site-locale');
    assert.equal(target.siteAlias, 'global');
    assert.equal(target.locale, 'en-US');
    assert.equal(target.currency, 'USD');
    assert.equal(storefrontPath(target, '/cart'), '/global/en-US/cart');
  });

  it('allows explicit safe overrides without changing the selected profile name', () => {
    const target = resolveTarget({
      E2E_TARGET: 'staging',
      E2E_BASE_URL: 'https://example.test/',
      E2E_PATH_STYLE: 'site-locale',
      E2E_SITE_ALIAS: 'preview',
      E2E_LOCALE: 'de-DE',
      E2E_CURRENCY: 'EUR',
      SFCC_ORG_ID: 'org-test',
      SFCC_SITE_ID: 'site-test',
    });

    assert.equal(target.name, 'staging');
    assert.equal(target.baseURL, 'https://example.test');
    assert.equal(storefrontPath(target, 'cart'), '/preview/de-DE/cart');
    assert.equal(target.currency, 'EUR');
    assert.equal(target.orgId, 'org-test');
    assert.equal(target.siteId, 'site-test');
  });

  it('rejects an unknown target and invalid path style', () => {
    assert.throws(() => resolveTarget({ E2E_TARGET: 'production' }), /Unknown E2E_TARGET/);
    assert.throws(() => resolveTarget({ E2E_PATH_STYLE: 'invalid' }), /E2E_PATH_STYLE/);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
node --experimental-strip-types --no-warnings support/targets.test.ts
```

Expected: FAIL with a module-not-found error for `support/targets.ts`.

- [ ] **Step 3: Implement the minimal resolver**

Create `support/targets.ts` with the two committed profiles and lazy environment resolution:

```ts
export type TargetName = 'staging' | 'canary';
export type PathStyle = 'root' | 'site-locale';

export interface StorefrontTarget {
  readonly name: TargetName;
  readonly label: string;
  readonly baseURL: string;
  readonly pathStyle: PathStyle;
  readonly siteAlias: string;
  readonly locale: string;
  readonly currency: string;
  readonly shortCode: string;
  readonly orgId: string;
  readonly siteId: string;
  readonly publicClientId: string;
  readonly privateClientId: string;
}

export const targetProfiles: Readonly<Record<TargetName, StorefrontTarget>> = {
  staging: {
    name: 'staging',
    label: 'official extra-features E2E storefront',
    baseURL: 'https://scaffold-pwa-extra-features-e2e.mobify-storefront.com',
    pathStyle: 'root',
    siteAlias: 'global',
    locale: 'en-GB',
    currency: 'GBP',
    shortCode: 'kv7kzm78',
    orgId: 'f_ecom_zzrf_001',
    siteId: 'RefArchGlobal',
    publicClientId: '475ad705-e2c1-4808-af78-81661f754511',
    privateClientId: '475ad705-e2c1-4808-af78-81661f754511',
  },
  canary: {
    name: 'canary',
    label: 'public PWA Kit demo',
    baseURL: 'https://pwa-kit.mobify-storefront.com',
    pathStyle: 'site-locale',
    siteAlias: 'global',
    locale: 'en-US',
    currency: 'USD',
    shortCode: 'kv7kzm78',
    orgId: 'f_ecom_zzrf_001',
    siteId: 'RefArchGlobal',
    publicClientId: 'c9c45bfd-0ed3-4aa2-9971-40f88962b836',
    privateClientId: '083859f2-5d93-4209-b999-a112266d63a0',
  },
};

const isTargetName = (value: string): value is TargetName =>
  value === 'staging' || value === 'canary';

const override = (input: NodeJS.ProcessEnv, key: string, fallback: string): string =>
  input[key] ?? fallback;

export function resolveTarget(input: NodeJS.ProcessEnv = process.env): StorefrontTarget {
  const nameValue = input.E2E_TARGET ?? 'staging';
  if (!isTargetName(nameValue)) {
    throw new Error(`Unknown E2E_TARGET "${nameValue}"; expected staging or canary`);
  }

  const profile = targetProfiles[nameValue];
  const pathStyle = override(input, 'E2E_PATH_STYLE', profile.pathStyle);
  if (pathStyle !== 'root' && pathStyle !== 'site-locale') {
    throw new Error(`E2E_PATH_STYLE "${pathStyle}" must be root or site-locale`);
  }

  return {
    ...profile,
    baseURL: override(input, 'E2E_BASE_URL', profile.baseURL).replace(/\/+$/, ''),
    pathStyle,
    siteAlias: override(input, 'E2E_SITE_ALIAS', profile.siteAlias),
    locale: override(input, 'E2E_LOCALE', profile.locale),
    currency: override(input, 'E2E_CURRENCY', profile.currency),
    shortCode: override(input, 'SFCC_SHORT_CODE', profile.shortCode),
    orgId: override(input, 'SFCC_ORG_ID', profile.orgId),
    siteId: override(input, 'SFCC_SITE_ID', profile.siteId),
    publicClientId: override(input, 'SFCC_PUBLIC_CLIENT_ID', profile.publicClientId),
    privateClientId: override(input, 'SFCC_PRIVATE_CLIENT_ID', profile.privateClientId),
  };
}

export function storefrontPath(target: StorefrontTarget, path = ''): string {
  const suffix = path.replace(/^\/+/, '');
  if (target.pathStyle === 'root') {
    return suffix ? `/${suffix}` : '/';
  }
  const prefix = `/${target.siteAlias}/${target.locale}`;
  return suffix ? `${prefix}/${suffix}` : prefix;
}

export function storefrontUrl(target: StorefrontTarget, path = ''): string {
  return new URL(storefrontPath(target, path), target.baseURL).toString();
}
```

Add `"test:targets": "node --experimental-strip-types --no-warnings support/targets.test.ts"` to `package.json` and add `"support"` to the TypeScript `include` array.

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
pnpm test:targets
pnpm typecheck
```

Expected: all target resolver tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit the resolver**

```bash
git add support/targets.ts support/targets.test.ts tsconfig.json package.json
git commit -m "test: add storefront target profiles"
```

### Task 2: Wire API, E2E navigation, and Playwright config to the profile

**Files:**

- Modify: `api/support/env.ts`
- Modify: `api/support/app-config.ts`
- Modify: `e2e/support/site.ts`
- Modify: `playwright.config.ts`
- Modify: `.env.example`

**Interfaces:**

- `api/support/env.ts` continues exporting the existing `env`, `buildPath`, `proxyApiUrl`, `slasPrivateUrl`, `slasPublicUrl`, `withSite`, `withLocale`, `callbackUri`, and auth helpers.
- `e2e/support/site.ts` continues exporting `buildPath`, `dismissConsent`, and `openPath`.
- Both layers call `storefrontPath`/`storefrontUrl`; neither keeps a second profile implementation.

- [ ] **Step 1: Add a regression assertion for each caller**

Extend `support/targets.test.ts` with the following import and assertions so the shared resolver is the only path contract:

```ts
it('normalizes the root app-config URL and nested route URLs identically', () => {
  const target = resolveTarget({});

  assert.equal(
    storefrontUrl(target),
    'https://scaffold-pwa-extra-features-e2e.mobify-storefront.com/',
  );
  assert.equal(
    storefrontUrl(target, '/product/25720033M'),
    'https://scaffold-pwa-extra-features-e2e.mobify-storefront.com/product/25720033M',
  );
});
```

- [ ] **Step 2: Run the regression test before wiring**

Run:

```bash
pnpm test:targets
```

Expected: PASS, establishing the shared behavior before replacing the duplicated callers.

- [ ] **Step 3: Replace duplicated environment and path construction**

In `api/support/env.ts`, resolve the target once and preserve the current public object names while adding `E2E_TARGET` and `E2E_CURRENCY`:

```ts
import { resolveTarget, storefrontPath, storefrontUrl } from '../../support/targets';

const target = resolveTarget();

export const env = {
  E2E_TARGET: target.name,
  E2E_BASE_URL: target.baseURL,
  E2E_SITE_ALIAS: target.siteAlias,
  E2E_LOCALE: target.locale,
  E2E_CURRENCY: target.currency,
  SFCC_SHORT_CODE: target.shortCode,
  SFCC_ORG_ID: target.orgId,
  SFCC_SITE_ID: target.siteId,
  SFCC_PUBLIC_CLIENT_ID: target.publicClientId,
  SFCC_PRIVATE_CLIENT_ID: target.privateClientId,
  SFCC_PRIVATE_CLIENT_SECRET_PLACEHOLDER: '_PLACEHOLDER_PROXY-PWA_KIT_SLAS_CLIENT_SECRET',
} as const;

export const buildPath = (path = ''): string => storefrontPath(target, path);
```

Keep the existing `organizationPath`, `proxyApiUrl`, auth helpers, and query helpers below this block unchanged except for using the new `env` values. Add:

```ts
export const storefrontRequestUrl = (path = ''): string => storefrontUrl(target, path);
```

In `api/support/app-config.ts`, replace the `new URL(buildPath(''), env.E2E_BASE_URL)` expression with `storefrontRequestUrl()`.

In `e2e/support/site.ts`, replace the two `process.env` constants and local prefix logic with:

```ts
import { resolveTarget, storefrontPath } from '../../support/targets';

const target = resolveTarget();

export function buildPath(path = ''): string {
  return storefrontPath(target, path);
}
```

Leave consent handling and `openPath` behavior unchanged.

In `playwright.config.ts`, call `dotenv.config()` first in the module body, then resolve the target and use its base URL and locale:

```ts
import { resolveTarget } from './support/targets';

dotenv.config();
const target = resolveTarget();

export default defineConfig({
  // retain the existing test directories, retry policy, and timeout settings
  use: {
    baseURL: target.baseURL,
    locale: target.locale,
    // retain the existing trace, screenshot, video, and timeout settings
  },
});
```

Update `.env.example` so profile selection is the normal entry point and old hard-coded values do not override it:

```dotenv
# Named storefront profile. staging is the official seeded E2E deployment;
# set canary to exercise the public demo.
E2E_TARGET=staging

# Optional safe overrides. Leave unset to use the selected profile.
# E2E_BASE_URL=
# E2E_PATH_STYLE=
# E2E_SITE_ALIAS=
# E2E_LOCALE=
# E2E_CURRENCY=
# SFCC_SHORT_CODE=
# SFCC_ORG_ID=
# SFCC_SITE_ID=
# SFCC_PUBLIC_CLIENT_ID=
# SFCC_PRIVATE_CLIENT_ID=
```

- [ ] **Step 4: Run path/config and existing smoke checks**

Run the following against the staging profile:

```bash
pnpm test:targets
pnpm typecheck
E2E_TARGET=staging pnpm exec playwright test --project=api api/tests/a-discovery-and-browse.spec.ts --grep 'A1 - Search for a product by keyword' --reporter=dot
E2E_TARGET=staging pnpm exec playwright test --project=e2e e2e/tests/a-discovery-and-browse.spec.ts --grep 'A1 - Search for a product by keyword' --reporter=dot
```

Expected: both A1 tests pass against the root-routed official deployment.

- [ ] **Step 5: Commit profile wiring**

```bash
git add api/support/env.ts api/support/app-config.ts e2e/support/site.ts playwright.config.ts .env.example support/targets.test.ts
git commit -m "test: use target profiles for storefront paths"
```

### Task 3: Make configuration, currency, and localization assertions target-aware

**Files:**

- Modify: `api/support/schemas.ts`
- Modify: `api/support/baskets.client.ts`
- Modify: `api/tests/g-localization.spec.ts`
- Modify: `e2e/tests/g-localization.spec.ts`
- Modify: `e2e/tests/e-checkout.spec.ts`

**Interfaces:**

- `readAppConfig` returns the same `StorefrontAppConfig` shape for both profiles.
- `env.E2E_CURRENCY` is the currency used when the basket is created.
- Localization tests select the configured site by `env.SFCC_SITE_ID`, use `env.E2E_LOCALE` as the English locale, and retain German as the second supported locale.

- [ ] **Step 1: Capture the staging regressions before changing contracts**

Run the known target-sensitive tests:

```bash
E2E_TARGET=staging pnpm exec playwright test --project=api \
  api/tests/a-discovery-and-browse.spec.ts \
  api/tests/b-account-lifecycle.spec.ts \
  api/tests/e-checkout.spec.ts \
  api/tests/g-localization.spec.ts \
  --grep 'A3|B3|B4|B5|E3|E5|G1' --reporter=dot
```

Expected before the fix: configuration-based tests fail because the staging app omits some optional `commerceAgent` keys and G1 assumes `config.sites[0]` is `RefArchGlobal`. Record the output as the regression proof for this task.

- [ ] **Step 2: Normalize omitted optional commerce-agent flags and target currency**

In `api/support/schemas.ts`, change the five commerce-agent string fields to default to the config-off value when a deployment omits them:

```ts
commerceAgent: loose({
  enabled: z.string().default('false'),
  askAgentOnSearch: z.string().default('false'),
  enableAgentFromHeader: z.string().default('false'),
  enableAgentFromFloatingButton: z.string().default('false'),
  enableAgentFromSearchSuggestions: z.string().default('false'),
}),
```

In `api/support/baskets.client.ts`, replace the hard-coded currency and stale comment. Keep the existing basket-create request, response parse, and status assertion unchanged; replace the currency patch block with:

```ts
/** Creates a basket, then pins its currency to the selected storefront profile. */
const patch = await this.request.patch(this.apiUrl(V1, `baskets/${basket.basketId}`), {
  headers: this.json(accessToken),
  params: withLocale(),
  data: { currency: env.E2E_CURRENCY },
});
```

- [ ] **Step 3: Make both localization journeys resolve the configured site and locale**

In `api/tests/g-localization.spec.ts`, import `env` and replace the first-site/English literals with:

```ts
const config = await readAppConfig(request);
const site = config.sites.find((candidate) => candidate.id === env.SFCC_SITE_ID);
if (!site) {
  throw new Error(`Storefront config contains no site ${env.SFCC_SITE_ID}`);
}
const locales = site.l10n.supportedLocales;

expect(locales.map((locale) => locale.id)).toEqual(
  expect.arrayContaining([env.E2E_LOCALE, 'de-DE']),
);

const german = await search.productSearch(guestSession.accessToken, {
  q: 'tie',
  locale: 'de-DE',
});
expect(german.total ?? 0).toBeGreaterThan(0);

const english = await search.productSearch(guestSession.accessToken, {
  q: 'tie',
  locale: env.E2E_LOCALE,
});
expect(english.total ?? 0).toBeGreaterThan(0);
```

Retain the existing product-hit assertions and the test title.

In `e2e/tests/g-localization.spec.ts`, resolve the target site and use option values rather than profile-specific labels:

```ts
import { resolveTarget } from '../../support/targets';

const target = resolveTarget();
// after readAppConfig(page)
const site = config.sites.find((candidate) => candidate.id === target.siteId);
if (!site) {
  throw new Error(`Storefront config contains no site ${target.siteId}`);
}
await expect(localeSelector.getByRole('option')).toHaveCount(site.l10n.supportedLocales.length);

await localeSelector.selectOption('de-DE');
await expect(page).toHaveURL(/\/global\/de-DE(\/|$)/);
await expect(page.getByRole('combobox', { name: 'Sprache auswählen' })).toBeVisible();

await page.getByRole('combobox', { name: 'Sprache auswählen' }).selectOption(target.locale);
await expect(page).toHaveURL(new RegExp(`/global/${target.locale}(\/|$)`));
await expect(page.getByRole('combobox', { name: 'Select Language' })).toBeVisible();
```

Keep the existing bounded `toPass` wrapper around each locale switch; only replace the hard-coded option labels and `en-US` URL expectations inside it.

In `e2e/tests/e-checkout.spec.ts`, accept the target's localized zero-cost copy without weakening the behavior assertion:

```ts
await expect(page.getByText('Free').or(page.getByText(/[$£]0\.00/))).toBeVisible();
```

- [ ] **Step 4: Run the staging regression and paired checks**

Run:

```bash
E2E_TARGET=staging pnpm exec playwright test --project=api \
  api/tests/a-discovery-and-browse.spec.ts \
  api/tests/b-account-lifecycle.spec.ts \
  api/tests/e-checkout.spec.ts \
  api/tests/g-localization.spec.ts \
  --grep 'A3|B3|B4|B5|E3|E5|G1' --reporter=dot
E2E_TARGET=staging pnpm exec playwright test --project=e2e \
  e2e/tests/e-checkout.spec.ts e2e/tests/g-localization.spec.ts --reporter=dot
pnpm check:title-parity
pnpm typecheck
pnpm lint
```

Expected: the previously failing staging config/localization tests pass, the checkout flows use GBP, and title parity remains green.

- [ ] **Step 5: Commit target-aware contracts**

```bash
git add api/support/schemas.ts api/support/baskets.client.ts api/tests/g-localization.spec.ts e2e/tests/g-localization.spec.ts e2e/tests/e-checkout.spec.ts
git commit -m "test: support staged storefront configuration"
```

### Task 4: Add fail-fast target preflight

**Files:**

- Create: `scripts/check-target.mjs`
- Modify: `package.json: scripts`
- Modify: `tsconfig.json: include`

**Interfaces:**

- Adds `pnpm check:target`.
- The script exits zero only after root SSR config, private-token proxy, supported locale/currency, and seeded store data are verified.
- The script prints target name, URL, org/site, locale, and store count only; it never prints tokens or authorization headers.

- [ ] **Step 1: Write the preflight script against the real staging target**

Create `scripts/check-target.mjs` with the following complete flow:

```js
import { resolveTarget, storefrontUrl } from '../support/targets.ts';

const target = resolveTarget();
const fail = (message) => {
  console.error(`Target preflight failed: ${message}`);
  process.exitCode = 1;
};

const organizationPath = (resourcePath) =>
  `organizations/${target.orgId}/${resourcePath.replace(/^\/+/, '')}`;
const apiUrl = (family, resourcePath) =>
  `${target.baseURL}/mobify/proxy/api/${family}/${organizationPath(resourcePath)}`;
const slasUrl = (resourcePath) =>
  `${target.baseURL}/mobify/slas/private/shopper/auth/v1/${organizationPath(resourcePath)}`;
const basic = Buffer.from(
  `${target.privateClientId}:_PLACEHOLDER_PROXY-PWA_KIT_SLAS_CLIENT_SECRET`,
).toString('base64');

const root = await fetch(storefrontUrl(target));
if (!root.ok) {
  fail(`root document returned HTTP ${root.status}`);
  process.exit();
}
const html = await root.text();
const match = html.match(/<script\b[^>]*\bid=(['"])mobify-data\1[^>]*>([\s\S]*?)<\/script>/i);
if (!match) {
  fail('root document has no mobify-data script');
  process.exit();
}

const app = JSON.parse(match[2]).__CONFIG__?.app;
const commerce = app?.commerceAPI?.parameters;
if (commerce?.organizationId !== target.orgId || commerce?.siteId !== target.siteId) {
  fail(
    `commerce config was org=${commerce?.organizationId ?? '<missing>'}, site=${commerce?.siteId ?? '<missing>'}`,
  );
}
if (app?.defaultSite !== target.siteId) {
  fail(`default site was ${app?.defaultSite ?? '<missing>'}`);
}
const site = app?.sites?.find((candidate) => candidate.id === target.siteId);
const supportedLocales = site?.l10n?.supportedLocales ?? [];
if (!supportedLocales.some((locale) => locale.id === target.locale)) {
  fail(`locale ${target.locale} is not advertised for ${target.siteId}`);
}
if (!supportedLocales.some((locale) => locale.preferredCurrency === target.currency)) {
  fail(`currency ${target.currency} is not advertised for ${target.siteId}`);
}

const tokenResponse = await fetch(slasUrl('oauth2/token'), {
  method: 'POST',
  headers: {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    channel_id: target.siteId,
    dnt: 'true',
  }),
});
if (!tokenResponse.ok) {
  fail(`private SLAS token proxy returned HTTP ${tokenResponse.status}`);
  process.exit();
}
const token = (await tokenResponse.json()).access_token;
if (typeof token !== 'string' || token.length === 0) {
  fail('private SLAS token response had no access_token');
  process.exit();
}

const storeSearch = new URL(apiUrl('store/shopper-stores/v1', 'store-search'));
storeSearch.search = new URLSearchParams({
  postalCode: '94103',
  countryCode: 'US',
  distanceUnit: 'km',
  maxDistance: '100',
  limit: '200',
  siteId: target.siteId,
  locale: target.locale,
}).toString();
const storesResponse = await fetch(storeSearch, {
  headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
});
if (!storesResponse.ok) {
  fail(`store-search returned HTTP ${storesResponse.status}`);
  process.exit();
}
const stores = await storesResponse.json();
if (!Array.isArray(stores.data) || stores.data.length === 0) {
  fail('store-search returned no seeded stores');
  process.exit();
}

console.log(
  `Target ready: ${target.name} ${target.baseURL} (${target.orgId}/${target.siteId}, ${target.locale}, ${target.currency}); stores=${stores.data.length}`,
);
```

Add `"check:target": "node --experimental-strip-types --no-warnings scripts/check-target.mjs"` to `package.json` and add `"scripts"` to `tsconfig.json` `include` so imported TypeScript is typechecked.

- [ ] **Step 2: Run the preflight against staging and canary**

Run:

```bash
E2E_TARGET=staging pnpm check:target
E2E_TARGET=canary pnpm check:target
```

Expected: both commands exit zero and print only non-sensitive target metadata. If canary's deployment changes its advertised config, the command must fail with the mismatched field rather than being relaxed.

- [ ] **Step 3: Verify failure diagnostics with an unsupported site override**

Run:

```bash
E2E_TARGET=staging SFCC_SITE_ID=RefArch pnpm check:target
```

Expected: non-zero exit with a commerce site mismatch message and no access token or authorization header in output. The resolver's unit test separately verifies that unknown environment keys do not alter a profile.

- [ ] **Step 4: Commit preflight**

```bash
git add scripts/check-target.mjs package.json tsconfig.json
git commit -m "test: add storefront target preflight"
```

### Task 5: Assign explicit pipeline tags to both 28-test layers

**Files:**

- Modify: `api/tests/a-discovery-and-browse.spec.ts`
- Modify: `api/tests/b-account-lifecycle.spec.ts`
- Modify: `api/tests/c-wishlist.spec.ts`
- Modify: `api/tests/d-cart.spec.ts`
- Modify: `api/tests/e-checkout.spec.ts`
- Modify: `api/tests/f-store-locator.spec.ts`
- Modify: `api/tests/g-localization.spec.ts`
- Modify: `api/tests/h-hybrid-continuity-and-oms.spec.ts`
- Modify: `e2e/tests/a-discovery-and-browse.spec.ts`
- Modify: `e2e/tests/b-account-lifecycle.spec.ts`
- Modify: `e2e/tests/c-wishlist.spec.ts`
- Modify: `e2e/tests/d-cart.spec.ts`
- Modify: `e2e/tests/e-checkout.spec.ts`
- Modify: `e2e/tests/f-store-locator.spec.ts`
- Modify: `e2e/tests/g-localization.spec.ts`
- Modify: `e2e/tests/h-hybrid-continuity-and-oms.spec.ts`
- Create: `docs/test-tier-matrix.md`

**Interfaces:**

- Existing feature tags remain unchanged.
- The same journey title receives the same pipeline tags in API and E2E files.
- `@smoke` is read-only; `@destructive` marks account, basket, profile, wishlist, address, payment, or order mutation; `@nightly` covers non-smoke regression tests; `@live` is reserved for the separate canary specs in the CI/reporting plan.

- [ ] **Step 1: Write the tier matrix before editing tests**

Create `docs/test-tier-matrix.md` with this matrix:

```md
# Test Tier Matrix

Pipeline tags are Playwright details metadata. Feature tags remain separate.

| Journeys           | `@smoke` | `@destructive` | `@nightly` |
| ------------------ | -------: | -------------: | ---------: |
| A1, A2, A3         |      yes |             no |         no |
| B1, B2, B3, B4, B5 |       no |          B1/B2 |        yes |
| B6, B7, B8, B9     |       no |            yes |        yes |
| C1, C2, C3         |       no |            yes |        yes |
| D1, D2             |       no |            yes |        yes |
| E1, E2, E3, E4, E5 |       no |            yes |        yes |
| F1, F2             |      yes |             no |         no |
| G1, G2             |      yes |             no |         no |
| H1                 |      yes |             no |         no |
| H2                 |       no |            yes |        yes |

`@live` is used only by read-only public-canary checks and never by a
mutating journey.
```

- [ ] **Step 2: Add the smoke tags to the read-only journeys**

For each matching API and E2E file, apply the exact metadata below while retaining existing feature/critical/config-off tags:

```ts
// A1
{
  tag: ['@critical', '@smoke'],
}

// A2
{
  tag: '@smoke',
}

// A3
{
  tag: ['@config-off', '@smoke'],
}

// F1, F2, G1, G2, and H1
{
  tag: '@smoke',
}
```

For G2, retain its existing `@config-off` metadata alongside `@smoke`; for H1, retain its feature tag. For describe-level tags, leave the existing feature tag as-is.

- [ ] **Step 3: Add nightly and destructive tags to mutating journeys**

Apply these exact metadata combinations in both layers:

```ts
// B1 and B2
{
  tag: ['@critical', '@destructive', '@nightly'],
}

// B3, B4, and B5
{
  tag: ['@boundary', '@nightly'],
}

// B6, B7, B8, B9, D1, D2, and H2
{
  tag: ['@destructive', '@nightly'],
}

// C1, C2, C3
{
  tag: ['@destructive', '@nightly'],
}

// E1, E2, E3, and E4
{
  tag: ['@critical', '@destructive', '@nightly'],
}

// E5
{
  tag: ['@defect', '@destructive', '@nightly'],
}
```

When a test already has more than one semantic tag, use one combined array, for example:

```ts
test(
  'B3 - Passwordless (email one-time code) login',
  {
    tag: ['@boundary', '@nightly'],
  },
  async ({ request, guestSession }, testInfo) => {
    // existing body unchanged
  },
);
```

Do not add `@live` to any existing paired journey.

- [ ] **Step 4: Verify exact tag selection and title parity**

Run:

```bash
pnpm check:title-parity
pnpm typecheck
pnpm lint
pnpm exec playwright test --project=api --list --grep @smoke
pnpm exec playwright test --project=e2e --list --grep @smoke
pnpm exec playwright test --project=api --list --grep @destructive
pnpm exec playwright test --project=e2e --list --grep @destructive
```

Expected: the API and E2E smoke lists contain A1-A3, F1-F2, G1-G2, and H1; the destructive lists contain the same journey IDs in both layers; no existing title changes.

- [ ] **Step 5: Commit tier metadata**

```bash
git add api/tests e2e/tests docs/test-tier-matrix.md
git commit -m "test: define storefront execution tiers"
```

### Task 6: Add alternate browser and device smoke projects

**Files:**

- Modify: `playwright.config.ts: projects`
- Modify: `package.json: scripts`

**Interfaces:**

- Existing `e2e` remains full Desktop Chrome and `api` remains unchanged.
- New projects are `e2e-firefox`, `e2e-webkit`, `mobile-chrome`, and `mobile-safari`.
- Each new browser/device project runs only `@smoke` tests from `e2e/tests`.

- [ ] **Step 1: Add project definitions**

Extend `projects` with these exact entries after the existing `e2e` project and before `api`:

```ts
{
  name: 'e2e-firefox',
  testDir: './e2e/tests',
  grep: /@smoke/,
  use: { ...devices['Desktop Firefox'] },
},
{
  name: 'e2e-webkit',
  testDir: './e2e/tests',
  grep: /@smoke/,
  use: { ...devices['Desktop Safari'] },
},
{
  name: 'mobile-chrome',
  testDir: './e2e/tests',
  grep: /@smoke/,
  use: { ...devices['Pixel 7'] },
},
{
  name: 'mobile-safari',
  testDir: './e2e/tests',
  grep: /@smoke/,
  use: { ...devices['iPhone 13'] },
},
```

Add scripts:

```json
"test:smoke": "playwright test --grep @smoke",
"test:cross-browser": "playwright test --project=e2e-firefox --project=e2e-webkit --project=mobile-chrome --project=mobile-safari"
```

- [ ] **Step 2: List projects and install required browsers**

Run:

```bash
pnpm exec playwright test --list --project=e2e-firefox --project=e2e-webkit --project=mobile-chrome --project=mobile-safari
pnpm exec playwright install chromium firefox webkit
```

Expected: each project lists only the tagged read-only journeys and browser installation completes.

- [ ] **Step 3: Run cross-browser smoke checks**

Run:

```bash
E2E_TARGET=staging pnpm test:cross-browser -- --reporter=dot
```

Expected: all four projects execute against the staging profile without creating accounts, baskets, or orders.

- [ ] **Step 4: Commit browser/device projects**

```bash
git add playwright.config.ts package.json
git commit -m "test: add browser and device smoke projects"
```

## Plan 1 completion gate

Run the complete foundation gate:

```bash
pnpm check:target
pnpm test:targets
pnpm check:title-parity
pnpm test:contracts
pnpm typecheck
pnpm lint
pnpm format:check
E2E_TARGET=staging pnpm test:smoke -- --reporter=dot
E2E_TARGET=staging pnpm test:cross-browser -- --reporter=dot
```

Expected: profile selection, root navigation, target-aware config/currency, tier filtering, and alternate smoke projects all pass before the dedicated quality suites are added.
