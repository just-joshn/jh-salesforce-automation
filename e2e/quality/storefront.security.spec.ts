import { expect, test, type Page } from '@playwright/test';
import { headerSearchBox, openPath } from '../support/site';

type WindowWithXssFlag = Window & { __xssTriggered?: boolean };

const xssPayloads = [
  '<script>alert("xss")</script>',
  '<img src="x" onerror="alert(1)">',
  '"><script>alert(1)</script>',
  'javascript:alert(1)',
  '<svg onload="alert(1)">',
] as const;

async function assertSearchDoesNotExecuteXss(page: Page, payload: string): Promise<void> {
  await page.evaluate(() => {
    (window as WindowWithXssFlag).__xssTriggered = false;
  });

  const searchBox = headerSearchBox(page);
  await searchBox.fill(payload);
  await searchBox.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=/);

  const executed = await page.evaluate(() => (window as WindowWithXssFlag).__xssTriggered === true);
  expect(executed).toBe(false);

  // Only assert raw-tag injection for HTML payloads. A javascript: query will legitimately
  // appear in the URL and search box; the execution flag above is the signal that matters.
  if (payload.includes('<')) {
    expect(await page.content()).not.toContain(payload);
  }
}

test.describe('Storefront security boundaries', { tag: ['@nightly', '@security'] }, () => {
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
      (window as WindowWithXssFlag).__xssTriggered = false;
      window.alert = () => {
        (window as WindowWithXssFlag).__xssTriggered = true;
      };
    });

    await openPath(page);
    for (const payload of xssPayloads) {
      await assertSearchDoesNotExecuteXss(page, payload);
    }
  });
});
