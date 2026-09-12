import { expect, type Locator, type Page } from '@playwright/test';
import { fillAddressForm, isAddressFormBlank } from '../ui/address-form';
import type { AddressInput, CreditCardInput } from '../test-data';

export interface PlacedOrder {
  status: number;
  orderNumber: string;
}

export class CheckoutPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Checkout', level: 1 })).toBeVisible();
  }


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
    await expect(this.page).toHaveURL(/\/checkout$/);
  }


  async fillShippingAddress(address: AddressInput): Promise<void> {
    const addNewAddress = this.page.getByRole('button', { name: /add new address/i });
    const editShippingAddress = this.page.getByRole('button', { name: 'Edit Shipping Address' });
    const firstNameField = this.page.getByRole('textbox', { name: 'First Name' });
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

  async addMultiShipDeliveryAddress(productName: string, address: AddressInput): Promise<void> {
    await this.page
      .getByRole('button', { name: `Add new delivery address for ${productName}` })
      .click();
    await fillAddressForm(this.page, address);
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  async continueWithSelectedDeliveryAddresses(): Promise<void> {
    await this.page
      .getByRole('button', { name: 'Continue to next step with selected delivery addresses' })
      .click();
  }

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
        await expect(cardNumberField).toBeVisible({ timeout: 20_000 }).catch(() => {
          throw error;
        });
      }
    }
  }


  async fillPayment(card: CreditCardInput, billingAddress?: AddressInput): Promise<void> {
    const cardNumberField = this.page.getByRole('textbox', { name: 'Card Number' });
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



  private get placeOrderButton(): Locator {
    return this.page.getByTestId('sf-checkout-place-order-btn');
  }

  async attemptPlaceOrder(): Promise<void> {
    await this.placeOrderButton.click();
  }

  async expectPlaceOrderAvailable(): Promise<void> {
    await expect(this.placeOrderButton).toBeVisible();
  }

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

  async completeFromShippingStep(
    address: AddressInput,
    card: CreditCardInput,
  ): Promise<PlacedOrder> {
    await this.fillShippingAddress(address);
    await this.continueToPaymentIfPrompted();
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
