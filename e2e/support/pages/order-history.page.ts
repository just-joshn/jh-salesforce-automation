import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { openPath } from '../site';

/** /account/orders (list) and /account/orders/{orderNumber} (detail) — one order-history area. */
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

  /**
   * The order-history card's link is literally named "View Details"; the order number
   * renders as a sibling paragraph, not inside the link itself.
   */
  async viewDetails(): Promise<void> {
    await this.page.getByRole('link', { name: 'View Details' }).click();
  }

  async expectDetailUrl(orderNumber: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/account/orders/${orderNumber}`));
  }

  get trackingCard(): Locator {
    return this.page.getByTestId('order-tracking-card');
  }

  /** The tracking card can render a beat after its own data response settles. */
  async expectNotShipped(): Promise<void> {
    await expect(this.trackingCard.getByText(/not shipped/i)).toBeVisible({ timeout: 15_000 });
  }

  async expectNoCancelOrReturnActions(): Promise<void> {
    await expect(this.page.getByRole('button', { name: /^cancel/i })).toHaveCount(0);
    await expect(this.page.getByRole('button', { name: /^return/i })).toHaveCount(0);
  }
}
