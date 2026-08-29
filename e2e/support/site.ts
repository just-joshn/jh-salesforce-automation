import { expect, type Locator, type Page } from '@playwright/test';
import { resolveTarget, storefrontPath } from '../../support/targets';

const target = resolveTarget();

/** Builds a target-aware storefront path, including a locale prefix when configured. */
export function buildPath(path = ''): string {
  return storefrontPath(target, path);
}

// Tracks pages that have already had at least one consent-dismissal attempt. The dialog
// can still reappear later (e.g. after a PDP color-variant navigation), so this never
// skips the check entirely — it only shortens the timeout for repeat checks, since by
// then the app has had a full page lifecycle to decide whether to show it again.
const consentChecked = new WeakSet<Page>();

/** Header product search — the same control A1, A3, a11y, and XSS tests all drive. */
export function headerSearchBox(page: Page): Locator {
  return page.getByRole('searchbox', { name: 'Search for products...' });
}

/**
 * The storefront shows a blocking "Tracking Consent" dialog on the first paint of a
 * fresh browser context. Dismiss it (if present) so it never intercepts a later step.
 */
export async function dismissConsent(page: Page, timeout?: number): Promise<void> {
  const effectiveTimeout = timeout ?? (consentChecked.has(page) ? 1000 : 4000);
  const decline = page.getByRole('button', { name: 'Decline tracking' });
  try {
    await expect(decline).toBeVisible({ timeout: effectiveTimeout });
    await decline.click();
  } catch {
    // Consent dialog did not appear this check (already dismissed, or never shown) —
    // nothing to do.
  }
  consentChecked.add(page);
}

/** Opens the responsive header menu when the primary nav is collapsed behind it. */
export async function openPrimaryNavIfCollapsed(page: Page): Promise<void> {
  const menu = page.getByRole('button', { name: 'Menu' });
  const nav = page.getByRole('navigation');
  await expect(menu.or(nav).first()).toBeVisible();
  if (await menu.isVisible()) {
    await menu.click();
  }
}

/** Navigates to a locale-prefixed storefront path and clears the consent dialog. */
export async function openPath(page: Page, path = ''): Promise<void> {
  await page.goto(buildPath(path));
  await dismissConsent(page);
}
