import { expect, type Page, type Response } from '@playwright/test';
import { openPath } from '../site';

export class OrderHistoryPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<Response> {
    const ordersResponse = this.page.waitForResponse(
      (res) =>
        res.url().includes('/orders') &&
        res.url().includes('expand=oms') &&
        res.request().method() === 'GET',
    );
    await openPath(this.page, '/account/orders');
    return ordersResponse;
  }

  async gotoDetail(orderNumber: string): Promise<Response> {
    const detailResponse = this.page.waitForResponse(
      (res) => res.url().includes(`/orders/${orderNumber}`) && res.url().includes('oms'),
    );
    await openPath(this.page, `/account/orders/${orderNumber}`);
    return detailResponse;
  }

  async expectOrderListed(orderNumber: string): Promise<void> {
    await expect(this.page.getByText(`Order Number: ${orderNumber}`)).toBeVisible();
  }

  async viewDetails(): Promise<void> {
    await this.page.getByRole('link', { name: 'View Details' }).click();
  }

  async expectDetailUrl(orderNumber: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/account/orders/${orderNumber}`));
  }

  async expectNotShipped(): Promise<void> {
    await expect(
      this.page.getByTestId('order-tracking-card').getByText(/not shipped/i),
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectNoCancelOrReturnActions(): Promise<void> {
    await expect(this.page.getByRole('button', { name: /^cancel/i })).toHaveCount(0);
    await expect(this.page.getByRole('button', { name: /^return/i })).toHaveCount(0);
  }
}
