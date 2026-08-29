import { expect, type Page } from '@playwright/test';
import { AddedToCartDialog } from '../components/added-to-cart-dialog.component';
import {
  openStorePickerFromPdp,
  type StoreLocatorDialog,
} from '../components/store-locator-dialog.component';
import { dismissConsent, openPath } from '../site';

export interface ProductRef {
  id: string;
  color?: string;
}

/** A product detail page (PDP), opened directly by SKU. */
export class ProductPage {
  constructor(private readonly page: Page) {}

  async goto(product: ProductRef): Promise<void> {
    await openPath(this.page, `/product/${product.id}`);
  }

  /**
   * Selects the first PDP color swatch, when the product exposes more than one. The color
   * radios carry no reliable accessible name of their own, so this targets the first
   * radiogroup on the page structurally ("Color" always renders before the Ship/Pickup
   * radiogroup) rather than matching by color name.
   */
  async selectFirstColorOption(): Promise<void> {
    const colorGroup = this.page.getByRole('radiogroup').first();
    await expect(colorGroup).toBeVisible();
    // Native radios sit behind decorative swatches (same pointer-interception as pickup),
    // so visibility is not a useful gate — force-check the first radio in the group.
    await colorGroup.getByRole('radio').first().check({ force: true });
  }

  /** Opens the "Select Store" picker and returns its dialog, scoped to just that dialog. */
  async openStorePicker(): Promise<StoreLocatorDialog> {
    return openStorePickerFromPdp(this.page);
  }

  /**
   * PDP delivery-method toggle: switch the current line item to in-store pickup. Its radio
   * input sits behind a decorative label that intercepts pointer events — the same pattern
   * the storefront's color swatches, store-picker rows, and checkout's PayPal radio (E5)
   * all show — so the check is forced, same as those. Resolving a store re-enables this
   * option a moment after the picker dialog closes, so this waits for that first.
   */
  async choosePickUpInStore(): Promise<void> {
    const radio = this.page.getByRole('radio', { name: 'Pick Up in Store' });
    await expect(radio).toBeEnabled();
    await radio.check({ force: true });
    await expect(radio).toBeChecked();
  }

  async expectPickupStoreSelected(storeName: string): Promise<void> {
    await expect(this.page.getByRole('button', { name: storeName })).toBeVisible();
  }

  /** D1: adds the current PDP selection to the basket and returns its confirmation dialog. */
  async addToCart(): Promise<AddedToCartDialog> {
    // Selecting a color variant can land on a fresh navigation (new pid in the URL), which
    // re-shows the consent dialog; clear it again here so it never blocks this click. Short
    // timeout since this is a defensive re-check, not the first paint of a page.
    await dismissConsent(this.page, 1000);
    const addToCartButton = this.page.getByRole('button', { name: 'Add to Cart' });
    await expect(addToCartButton).toBeEnabled({ timeout: 15_000 });
    await addToCartButton.click();
    const dialog = new AddedToCartDialog(this.page);
    // The basket-mutation API this triggers can occasionally run past the default action
    // timeout under live-site load (observed directly, not a guess), so this gets its own
    // generous budget rather than inheriting actionTimeout.
    await dialog.waitForVisible(25_000);
    return dialog;
  }

  /** C1: clicks "Add to Wishlist" on the currently-open PDP. */
  async addToWishlist(): Promise<void> {
    await this.page.getByRole('button', { name: 'Add to Wishlist' }).click();
  }
}
