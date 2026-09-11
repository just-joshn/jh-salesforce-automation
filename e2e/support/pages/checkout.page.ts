import { expect, type Locator, type Page } from '@playwright/test';
import { fillAddressForm, isAddressFormBlank } from '../ui/address-form';
import type { AddressInput, CreditCardInput } from '../test-data';

export interface PlacedOrder {
  status: number;
  orderNumber: string;
}

/** The multi-step /checkout wizard: Contact Info -> Shipping -> Payment -> Review -> Place Order. */
export class CheckoutPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Checkout', level: 1 })).toBeVisible();
  }

  // --- Contact Info step -----------------------------------------------------------

  /** E1: Contact Info step for a guest shopper. */
  async continueAsGuest(email: string): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
    await this.page.getByRole('button', { name: 'Checkout as Guest' }).click();
  }

  async expectSignedInContactInfo(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Contact Info' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Checkout as Guest' })).toHaveCount(0);
  }

  async editContactInfo(): Promise<void> {
    await this.page.getByRole('button', { name: 'Edit Contact Info' }).click();
  }

  async expectOrderPlacementError(): Promise<void> {
    await expect(this.page.getByText(/unexpected error occurred during checkout/i)).toBeVisible();
    // Recovery, not a dead end: still on /checkout with the order ready to retry.
    await expect(this.page).toHaveURL(/\/checkout$/);
  }

  // --- Shipping step -----------------------------------------------------------------

  /**
   * Fills the Shipping Address step. A shopper with a saved address sees an address-book
   * radio list instead of a blank form, so switch to "+ Add New Address" first when that
   * control is present — this then works for both guest and signed-in checkout.
   */
  async fillShippingAddress(address: AddressInput): Promise<void> {
    const addNewAddress = this.page.getByRole('button', { name: /add new address/i });
    const editShippingAddress = this.page.getByRole('button', { name: 'Edit Shipping Address' });
    const firstNameField = this.page.getByRole('textbox', { name: 'First Name' });
    // Wait for whichever address state the checkout actually renders, rather than an
    // instant (racy) count(). Signed-in checkout can collapse the existing address first.
    await expect(editShippingAddress.or(addNewAddress).or(firstNameField).first()).toBeVisible({
      timeout: 15_000,
    });
    if (await editShippingAddress.isVisible()) {
      await editShippingAddress.click();
    }
    if (await addNewAddress.isVisible()) {
      await addNewAddress.click();
    }
    await fillAddressForm(this.page, address);
    await this.page.getByRole('button', { name: 'Continue to Shipping Method' }).click();
  }

  async shipToMultipleAddresses(): Promise<void> {
    await this.page.getByRole('button', { name: 'Ship to multiple addresses' }).click();
  }

  /** Multi-ship: adds a delivery address for one named line item. */
  async addMultiShipDeliveryAddress(productName: string, address: AddressInput): Promise<void> {
    await this.page
      .getByRole('button', { name: `Add new delivery address for ${productName}` })
      .click();
    await fillAddressForm(this.page, address);
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  // Multi-ship's continue action carries its own accessible name, distinct from the
  // single-address step's "Continue to Shipping Method" button.
  async continueWithSelectedDeliveryAddresses(): Promise<void> {
    await this.page
      .getByRole('button', { name: 'Continue to next step with selected delivery addresses' })
      .click();
  }

  /**
   * Confirms the Shipping & Gift Options step when it needs an explicit continue.
   * Single-address checkout auto-advances past its one Ground default; multi-ship — one
   * shipping-method choice per delivery — sometimes needs this click and sometimes
   * auto-advances first. An instant, zero-wait count() would race the step's own render,
   * so this waits for either outcome to settle before deciding.
   */
  async continueToPaymentIfPrompted(): Promise<void> {
    const continueToPayment = this.page.getByRole('button', { name: 'Continue to Payment' });
    const cardNumberField = this.page.getByRole('textbox', { name: 'Card Number' });
    await expect(continueToPayment.or(cardNumberField).first()).toBeVisible({
      timeout: 15_000,
    });
    if (await continueToPayment.isVisible()) {
      try {
        await continueToPayment.click({ timeout: 5000 });
      } catch (error) {
        // Multi-ship sometimes advances while the transient checkout overlay is still
        // intercepting the button. Treat that as auto-advance only when Payment appears.
        await expect(cardNumberField).toBeVisible({ timeout: 20_000 }).catch(() => {
          throw error;
        });
      }
    }
  }

  // --- Payment step --------------------------------------------------------------------

  /**
   * Payment step: fills the credit card fields and continues to Review Order. When there
   * is no shipping address to default "Same as shipping" from (BOPIS has none), a blank
   * billing-address form appears too — pass `billingAddress` to fill it in that case.
   */
  async fillPayment(card: CreditCardInput, billingAddress?: AddressInput): Promise<void> {
    const cardNumberField = this.page.getByRole('textbox', { name: 'Card Number' });
    // The Payment step transition (heaviest on multi-ship, which has the most prior steps)
    // can occasionally take longer than the default action timeout under live-site load.
    await expect(cardNumberField).toBeVisible({ timeout: 25_000 });
    await cardNumberField.fill(card.number);
    await this.page.getByRole('textbox', { name: 'Name on Card' }).fill(card.name);
    await this.page.getByRole('textbox', { name: 'Expiration Date' }).fill(card.expiration);
    await this.page.getByRole('textbox', { name: 'Security Code' }).fill(card.cvv);

    if (billingAddress && (await isAddressFormBlank(this.page))) {
      await fillAddressForm(this.page, billingAddress);
    }
    await this.page.getByRole('button', { name: 'Review Order' }).click();
  }


  // --- Review / place order ------------------------------------------------------------

  // Two buttons share the accessible name "Place Order"; only the review-step submit
  // control carries this test id (confirmed live: strict-mode violation without it).
  private get placeOrderButton(): Locator {
    return this.page.getByTestId('sf-checkout-place-order-btn');
  }

  /** Clicks Place Order without waiting for confirmation — used to assert a refused attempt. */
  async attemptPlaceOrder(): Promise<void> {
    await this.placeOrderButton.click();
  }

  async expectPlaceOrderAvailable(): Promise<void> {
    await expect(this.placeOrderButton).toBeVisible();
  }

  /** Places the reviewed order and returns the API status plus the minted order number. */
  async placeOrder(): Promise<PlacedOrder> {
    const placeOrderButton = this.placeOrderButton;
    await expect(placeOrderButton).toBeEnabled();
    const orderResponse = this.page.waitForResponse(
      (res) => /\/orders(\?|$)/.test(res.url()) && res.request().method() === 'POST',
    );
    await placeOrderButton.click();
    const response = await orderResponse;
    await expect(this.page.getByRole('heading', { name: 'Thank you for your order!' })).toBeVisible(
      { timeout: 20_000 },
    );
    const match = /\/confirmation\/([^/?]+)/.exec(this.page.url());
    return { status: response.status(), orderNumber: match?.[1] ?? '' };
  }

  /** Shipping Address -> Payment -> Review -> Place Order, for a shopper already on that step. */
  async completeFromShippingStep(
    address: AddressInput,
    card: CreditCardInput,
  ): Promise<PlacedOrder> {
    await this.fillShippingAddress(address);
    await this.fillPayment(card);
    return this.placeOrder();
  }

  async expectOrderConfirmation(order: PlacedOrder, email?: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/checkout/confirmation/${order.orderNumber}`));
    await expect(
      this.page.getByText(new RegExp(`Order Number: ${order.orderNumber}`)),
    ).toBeVisible();
    if (email) {
      await expect(this.page.getByText(email)).toBeVisible();
    }
  }
}
