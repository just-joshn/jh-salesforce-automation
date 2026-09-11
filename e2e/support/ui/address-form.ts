import type { Page } from '@playwright/test';
import type { AddressInput } from '../test-data';

/**
 * The address form fields shared by three different contexts: Account > Add Address,
 * checkout's Shipping Address step, and multi-ship's per-delivery address form — the
 * same fields, the same behavior, wherever an address needs to be entered.
 */
export async function fillAddressForm(page: Page, address: AddressInput): Promise<void> {
  await page.getByRole('textbox', { name: 'First Name' }).fill(address.firstName);
  await page.getByRole('textbox', { name: 'Last Name' }).fill(address.lastName);
  await page.getByRole('textbox', { name: 'Phone' }).fill(address.phone);
  await page.getByRole('textbox', { name: 'Address', exact: true }).fill(address.address);
  await page.getByRole('textbox', { name: 'City' }).fill(address.city);
  await page.getByRole('combobox', { name: 'State' }).selectOption(address.state);
  await page.getByRole('textbox', { name: 'Zip Code' }).fill(address.zip);
}

/** True when a blank form is on screen right now (vs. e.g. an address-book radio list). */
export async function isAddressFormBlank(page: Page): Promise<boolean> {
  return page.getByRole('textbox', { name: 'First Name' }).isVisible();
}
