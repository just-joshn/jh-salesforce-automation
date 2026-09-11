import { expect, type Page } from '@playwright/test';
import { openPath } from '../site';

export async function gotoCart(page: Page): Promise<void> {
  await openPath(page, '/cart');
}

export async function expectCartItemCount(page: Page, count: number): Promise<void> {
  await expect(
    page.getByRole('button', { name: `My cart, number of items: ${count}` }),
  ).toBeVisible({ timeout: 20_000 });
}
