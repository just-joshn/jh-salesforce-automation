import type { Page } from '@playwright/test';


export async function proceedToCheckoutFromCartDialog(page: Page): Promise<void> {
  await page.getByRole('dialog').getByRole('link', { name: 'Proceed to Checkout' }).click();
}
