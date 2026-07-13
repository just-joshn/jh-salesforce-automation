import type { Page } from '@playwright/test';
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

/**
 * The storefront shows a blocking "Tracking Consent" dialog on the first paint of a
 * fresh browser context. Dismiss it (if present) so it never intercepts a later step.
 */
export async function dismissConsent(page: Page, timeout?: number): Promise<void> {
  const effectiveTimeout = timeout ?? (consentChecked.has(page) ? 1000 : 4000);
  const decline = page.getByRole('button', { name: 'Decline tracking' });
  try {
    await decline.waitFor({ state: 'visible', timeout: effectiveTimeout });
    await decline.click();
  } catch {
    // Consent dialog did not appear this check (already dismissed, or never shown) —
    // nothing to do.
  }
  consentChecked.add(page);
}

/** Navigates to a locale-prefixed storefront path and clears the consent dialog. */
export async function openPath(page: Page, path = ''): Promise<void> {
  await page.goto(buildPath(path));
  await dismissConsent(page);
}
