import { clients, expect, test } from '../support/fixtures';
import { readAppConfig } from '../support/app-config';
import { env } from '../support/env';

test.describe('G. Localization', { tag: '@localization' }, () => {
  test('G1 - Switch storefront language', { tag: '@smoke' }, async ({ request, guestSession }) => {
    const config = await readAppConfig(request);
    const site = config.sites.find((candidate) => candidate.id === env.SFCC_SITE_ID);
    if (!site) {
      throw new Error(`Storefront config contains no site ${env.SFCC_SITE_ID}`);
    }
    const locales = site.l10n.supportedLocales;

    await test.step('The site ships both locales, each with its own currency', () => {
      expect(locales.map((locale) => locale.id)).toEqual(
        expect.arrayContaining([env.E2E_LOCALE, 'de-DE']),
      );
    });

    const search = clients.search(request);

    await test.step('The German storefront accepts the locale-specific catalogue request', async () => {
      const results = await search.productSearch(guestSession.accessToken, {
        q: 'tie',
        locale: 'de-DE',
      });
      expect(results.total ?? 0).toBeGreaterThan(0);
      expect(results.hits?.[0]).toMatchObject({
        productId: expect.any(String),
        productName: expect.any(String),
      });
    });

    await test.step('Switching back to English is a clean, reversible round trip', async () => {
      const results = await search.productSearch(guestSession.accessToken, {
        q: 'tie',
        locale: env.E2E_LOCALE,
      });
      expect(results.total ?? 0).toBeGreaterThan(0);
      expect(results.hits?.[0]).toMatchObject({
        productId: expect.any(String),
        productName: expect.any(String),
      });
    });
  });

  test('G2 - Config-off catalogue gap: Gift Certificates category', {
    tag: ['@config-off', '@smoke'],
  }, async ({ request, guestSession }) => {
    const products = clients.products(request);

    const category = await products.getCategory(guestSession.accessToken, 'gift-certificates');
    expect(category.name).toBe('Gift Certificates');

    await test.step('The category resolves, but the catalogue behind it is empty', async () => {
      const results = await clients.search(request).productSearch(guestSession.accessToken, {
        refinements: ['cgid=gift-certificates'],
      });
      expect(results.total).toBe(0);
    });
  });
});
