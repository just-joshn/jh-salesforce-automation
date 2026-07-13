import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveTarget, storefrontPath, storefrontUrl } from './targets.ts';

void describe('target profiles', () => {
  void it('defaults to the staging profile', () => {
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

  void it('builds root-style staging paths', () => {
    const target = resolveTarget({});

    assert.equal(storefrontPath(target), '/');
    assert.equal(storefrontPath(target, '/cart'), '/cart');
    assert.equal(
      storefrontUrl(target, '/search?q=tie'),
      'https://scaffold-pwa-extra-features-e2e.mobify-storefront.com/search?q=tie',
    );
  });

  void it('selects the public demo canary profile', () => {
    const target = resolveTarget({ E2E_TARGET: 'canary' });

    assert.equal(target.name, 'canary');
    assert.equal(target.pathStyle, 'site-locale');
    assert.equal(target.siteAlias, 'global');
    assert.equal(target.locale, 'en-US');
    assert.equal(target.currency, 'USD');
    assert.equal(storefrontPath(target, '/cart'), '/global/en-US/cart');
  });

  void it('allows explicit safe overrides without changing the selected profile name', () => {
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

  void it('normalizes the root app-config URL and nested route URLs identically', () => {
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

  void it('rejects an unknown target and invalid path style', () => {
    assert.throws(() => resolveTarget({ E2E_TARGET: 'production' }), /Unknown E2E_TARGET/);
    assert.throws(() => resolveTarget({ E2E_PATH_STYLE: 'invalid' }), /E2E_PATH_STYLE/);
  });
});
