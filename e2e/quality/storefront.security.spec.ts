import { expect, test } from '@playwright/test';
import { openPath } from '../support/site';

const xssPayload = '"><img src=x onerror=alert(1)>';

test.describe('Storefront security boundaries', { tag: ['@nightly'] }, () => {
  test('root response carries the required security headers', async ({ page }) => {
    const response = await page.goto('/');
    expect(response, 'root response').not.toBeNull();
    const headers = response?.headers() ?? {};

    expect(headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['content-security-policy']).toContain("object-src 'none'");
    expect(headers['content-security-policy']).toContain("base-uri 'self'");
    expect(headers['x-frame-options']).toMatch(/^(SAMEORIGIN|DENY)$/);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('no-referrer');
  });

  test('private credentials are not exposed in document or request URLs', async ({ page }) => {
    const requestUrls: string[] = [];
    page.on('request', (request) => requestUrls.push(request.url()));

    await openPath(page);
    const document = await page.content();

    expect(document).not.toContain('PWA_KIT_SLAS_CLIENT_SECRET');
    expect(document).not.toContain('client_secret=');
    expect(requestUrls.some((url) => /client_secret|access_token|password/i.test(url))).toBe(false);
  });

  test('search input does not execute reflected XSS', async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __xssTriggered?: boolean }).__xssTriggered = false;
      window.alert = () => {
        (window as Window & { __xssTriggered?: boolean }).__xssTriggered = true;
      };
    });

    await openPath(page);
    const searchBox = page.getByRole('searchbox', { name: 'Search for products...' });
    await searchBox.fill(xssPayload);
    await searchBox.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=/);

    const executed = await page.evaluate(
      () => (window as Window & { __xssTriggered?: boolean }).__xssTriggered === true,
    );
    expect(executed).toBe(false);
    expect(await page.content()).not.toContain('<img src=x onerror=alert(1)>');
  });
});
