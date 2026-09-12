import { expect, type Locator, type Page } from '@playwright/test';
import { resolveTarget, storefrontPath } from '../../support/targets';

const target = resolveTarget();

export function buildPath(path = ''): string {
  return storefrontPath(target, path);
}

export function headerSearchBox(page: Page): Locator {
  return page.getByRole('searchbox', { name: 'Search for products...' });
}

export function accountMenuButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Open account menu' });
}

export async function expectSignedIn(page: Page, timeout = 20_000): Promise<void> {
  await expect(accountMenuButton(page)).toBeVisible({ timeout });
}

export async function dismissConsent(page: Page, timeout?: number): Promise<void> {
  const effectiveTimeout = timeout ?? 4000;
  const decline = page.getByRole('button', { name: 'Decline tracking' });
  try {
    await expect(decline).toBeVisible({ timeout: effectiveTimeout });
  } catch {
    await expect(decline).toBeVisible({ timeout: 1000 }).catch(() => undefined);
    return;
  }
  await decline.click();
  await expect(decline).toBeHidden();
}

export async function openPrimaryNavIfCollapsed(page: Page): Promise<void> {
  const menu = page.getByRole('button', { name: 'Menu' });
  const nav = page.getByRole('navigation');
  await expect(menu.or(nav).first()).toBeVisible();
  if (await menu.isVisible()) {
    await menu.click();
  }
}

export async function openPath(page: Page, path = '', consentTimeout?: number): Promise<void> {
  await page.goto(buildPath(path));
  await dismissConsent(page, consentTimeout);
}

export async function openMain(page: Page, path = '', consentTimeout = 10_000): Promise<void> {
  await page.goto(buildPath(path));
  await dismissConsent(page, consentTimeout);
  await expect(page.getByRole('main')).toBeVisible();
  await dismissConsent(page, 2_000);
}
