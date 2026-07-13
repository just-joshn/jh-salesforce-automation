import { expect, type Page } from '@playwright/test';
import { AddressForm } from '../components/address-form.component';
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
    if (await editShippingAddress.count()) {
      await editShippingAddress.click();
    }
    if (await addNewAddress.count()) {
      await addNewAddress.click();
    }
    await new AddressForm(this.page).fill(address);
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
    await new AddressForm(this.page).fill(address);
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
   * so this waits for either outcome to actually settle before deciding. Racing a click
   * against a later auto-advance can also detach the button mid-click, so a failed click
   * is treated as "already advanced", not a real error — fillPayment's own wait is what
   * actually confirms we got there.
   */
  async continueToPaymentIfPrompted(): Promise<void> {
    const continueToPayment = this.page.getByRole('button', { name: 'Continue to Payment' });
    const cardNumberField = this.page.getByRole('textbox', { name: 'Card Number' });
    await expect(continueToPayment.or(cardNumberField).first()).toBeVisible({
      timeout: 15_000,
    });
    if (await continueToPayment.count()) {
      await continueToPayment.click({ timeout: 5000 }).catch(() => undefined);
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

    const billingForm = new AddressForm(this.page);
    if (billingAddress && (await billingForm.isBlank())) {
      await billingForm.fill(billingAddress);
    }
    await this.page.getByRole('button', { name: 'Review Order' }).click();
  }

  async expectConfigOffPaymentGaps(): Promise<void> {
    await expect(this.page.getByText(/express checkout/i)).toHaveCount(0);
    await expect(this.page.getByText(/one.?click checkout/i)).toHaveCount(0);
  }

  /**
   * E5: the PayPal radio cannot be selected by pointer — tracked as a live defect. A
   * sibling label intercepts pointer events on this radio, so a click never lands on the
   * input itself. Asserted directly and quickly here rather than via test.fail() plus a
   * full actionTimeout wait.
   */
  async expectPaypalUnselectable(): Promise<void> {
    const paypalRadio = this.page.getByRole('radio', { name: 'paypal-icon' });
    await paypalRadio.click({ timeout: 3000 }).catch(() => undefined);
    await expect(paypalRadio).not.toBeChecked();
    await expect(this.page.getByRole('radio', { name: /^Credit Card/ })).toBeChecked();
  }

  // --- Review / place order ------------------------------------------------------------

  /** Places the reviewed order and returns the API status plus the minted order number. */
  async placeOrder(): Promise<PlacedOrder> {
    const placeOrderButton = this.page.getByTestId('sf-checkout-place-order-btn');
    await placeOrderButton.waitFor({ state: 'visible' });
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
