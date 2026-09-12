import { expect, type Locator, type Page } from '@playwright/test';
import { dismissConsent, openPath } from '../site';

export interface ProductRef {
  id: string;
  color?: string;
}

export class ProductPage {
  constructor(private readonly page: Page) {}

  async goto(product: ProductRef): Promise<void> {
    await openPath(this.page, `/product/${product.id}`);
  }

  async selectFirstColorOption(): Promise<void> {
    const colorGroup = this.page.getByRole('radiogroup').first();
    await expect(colorGroup).toBeVisible();
    await colorGroup.getByRole('radio').first().check({ force: true });
  }

  async openStorePicker(): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Select Store' }).click();
    const dialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('heading', { name: 'Find a Store' }) });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  async choosePickUpInStore(): Promise<void> {
    const radio = this.page.getByRole('radio', { name: 'Pick Up in Store' });
    await expect(radio).toBeEnabled();
    await radio.check({ force: true });
    await expect(radio).toBeChecked();
  }

  async expectPickupStoreSelected(storeName: string): Promise<void> {
    await expect(this.page.getByRole('button', { name: storeName })).toBeVisible();
  }

  async addToCart(): Promise<void> {
    await dismissConsent(this.page, 1000);
    const addToCartButton = this.page.getByRole('button', { name: 'Add to Cart' });
    await expect(addToCartButton).toBeEnabled({ timeout: 15_000 });
    await addToCartButton.click();
    await expect(this.page.getByRole('dialog', { name: 'Added to Cart' })).toBeVisible({
      timeout: 25_000,
    });
  }

  async addToWishlist(): Promise<void> {
    await this.page.getByRole('button', { name: 'Add to Wishlist' }).click();
  }
}
