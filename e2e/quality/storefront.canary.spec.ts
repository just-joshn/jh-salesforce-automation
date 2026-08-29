import { expect, test, type Page } from '@playwright/test';
import { buildPath } from '../support/site';
import { PRODUCTS } from '../support/test-data';

async function expectReadOnlyNavigation(
  page: Page,
  path: string,
  expectedTitle: RegExp | string,
  expectedContent: string,
): Promise<void> {
  const nonReadOnlyMethods: string[] = [];
  page.on('request', (request) => {
    if (!['GET', 'HEAD'].includes(request.method())) {
      nonReadOnlyMethods.push(request.method());
    }
  });

  const response = await page.goto(buildPath(path));
  expect(response, `response for ${path || 'home'}`).not.toBeNull();
  expect(response?.status(), `status for ${path || 'home'}`).toBe(200);
  await expect(page).toHaveTitle(expectedTitle);
  await expect(page.getByText(expectedContent).first()).toBeVisible();
  expect(nonReadOnlyMethods, 'canary navigation methods').toEqual([]);
}

test.describe('Public storefront canary', { tag: '@live' }, () => {
  test('serves the public home page', { tag: '@live' }, async ({ page }) => {
    await expectReadOnlyNavigation(page, '', /Home Page/, PRODUCTS.silkTie.name);
  });

  test('serves public product search', { tag: '@live' }, async ({ page }) => {
    await expectReadOnlyNavigation(page, '/search?q=tie', 'tie', 'tie');
  });
});
