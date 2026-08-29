import { expect, test } from '@playwright/test';
import { readAppConfig } from '../support/app-config';
import { resolveTarget, storefrontPath } from '../../support/targets';
import { openPath, openPrimaryNavIfCollapsed } from '../support/site';

const target = resolveTarget();

const expectedLocaleUrl = (locale: string): RegExp => {
  const route = storefrontPath({ ...target, locale });
  if (route === '/') {
    return /\/$/;
  }
  return new RegExp(`${route.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}/?$`);
};

test.describe('G. Localization', { tag: '@localization' }, () => {
  test('G1 - Switch storefront language', { tag: '@smoke' }, async ({ page }) => {
    await openPath(page, '');
    const config = await readAppConfig(page);
    const site = config.sites.find((candidate) => candidate.id === target.siteId);
    if (!site) {
      throw new Error(`Storefront config contains no site ${target.siteId}`);
    }
    const localeSelector = page.getByRole('combobox', {
      name: /Select Language|Sprache auswählen/,
    });
    await expect(localeSelector.getByRole('option')).toHaveCount(site.l10n.supportedLocales.length);

    // A locale switch is a full page reload (new translation bundle). The <select> is
    // occasionally re-mounted by that reload before the click that opens it and the
    // subsequent option click both land, which drops the interaction entirely rather than
    // just delaying it (confirmed live: the URL can stay unchanged even after 20s). Retrying
    // the interaction itself — not just re-checking its result — is the correct tool here;
    // see assertions-waiting.md's toPass() polling pattern.
    await test.step('Switching to German changes the URL locale and translates the selector itself', async () => {
      await expect(async () => {
        await page
          .getByRole('combobox', { name: /Select Language|Sprache auswählen/ })
          .selectOption('de-DE');
        await expect(page).toHaveURL(expectedLocaleUrl('de-DE'), { timeout: 2000 });
      }).toPass({ timeout: 20_000 });
      await expect(page.getByRole('combobox', { name: 'Sprache auswählen' })).toBeVisible();
    });

    await test.step('Switching back to English is a clean, reversible round trip', async () => {
      await expect(async () => {
        const languageSelectors = page.getByRole('combobox');
        await expect(languageSelectors).toHaveCount(1, { timeout: 2000 });
        await languageSelectors.selectOption(target.locale);
        await expect(page).toHaveURL(expectedLocaleUrl(target.locale), { timeout: 2000 });
        await expect(languageSelectors).toHaveValue(target.locale, { timeout: 2000 });
      }).toPass({ timeout: 20_000 });
    });
  });

  test(
    'G2 - Config-off catalogue gap: Gift Certificates category',
    { tag: ['@config-off', '@smoke'] },
    async ({ page }) => {
      await openPath(page, '');
      await openPrimaryNavIfCollapsed(page);

      const categoryResponse = page.waitForResponse((res) =>
        res.url().includes('/categories/gift-certificates'),
      );
      await page.getByRole('link', { name: 'Gift Certificates' }).click();
      expect((await categoryResponse).status()).toBe(200);

      await expect(
        page.getByRole('heading', { level: 1, name: 'Gift Certificates', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { level: 1 }).filter({ hasText: '(0)' }),
      ).toBeVisible();
      await expect(page.getByText(/couldn.t find anything for gift certificates/i)).toBeVisible();
    },
  );
});
