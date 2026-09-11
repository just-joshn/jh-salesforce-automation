import { expect, test } from '@playwright/test';
import { readAppConfig } from '../support/app-config';
import { resolveTarget, storefrontPath } from '../../support/targets';
import { dismissConsent, openPath } from '../support/site';

const target = resolveTarget();

const expectedLocaleUrl = (locale: string): RegExp => {
  const route = storefrontPath({ ...target, locale });
  return route === '/' ? /\/$/ : new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`);
};

test.describe('G. Localization', { tag: '@localization' }, () => {
  test('G1 - Switch storefront language', { tag: '@smoke' }, async ({ page }) => {
    await openPath(page, '');
    const config = await readAppConfig(page);
    const site = config.sites.find((candidate) => candidate.id === target.siteId);
    if (!site) throw new Error(`Storefront config contains no site ${target.siteId}`);
    const localeSelector = page.getByRole('combobox', { name: /Select Language|Sprache auswählen/ });
    await expect(localeSelector.getByRole('option')).toHaveCount(site.l10n.supportedLocales.length);
    await test.step('Switching to German changes the URL locale and translates the selector itself', async () => {
      await expect(async () => {
        await page.getByRole('combobox', { name: /Select Language|Sprache auswählen/ }).selectOption('de-DE');
        await expect(page).toHaveURL(expectedLocaleUrl('de-DE'), { timeout: 2000 });
        await dismissConsent(page, 3_000);
      }).toPass({ timeout: 20_000 });
    });

  });
});
