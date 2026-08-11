import type { Locator, Page } from '@playwright/test';

export const productHeading = (page: Page, productName: string): Locator =>
  page.getByRole('heading', { name: productName, exact: true, level: 2 });

export const addToCartButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Add to Cart', exact: true });

export const addedToCartHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: '1 item added to cart', exact: true, level: 1 });

export const cartCountButton = (page: Page, itemCount: number): Locator =>
  page.getByRole('button', {
    name: `My cart, number of items: ${itemCount}`,
    exact: true,
    includeHidden: true,
  });

export const declineTrackingButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Decline tracking', exact: true });

export const cartProduct = (page: Page, productName: string): Locator =>
  page.getByRole('link', { name: productName, exact: true });

export const proceedToCheckoutLink = (page: Page): Locator =>
  page.getByRole('link', { name: /^Proceed to Checkout(?: Secure)?$/ });

export const checkoutHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Checkout', exact: true, level: 1 });

export const emailInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Email', exact: true });

export const checkoutAsGuestButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Checkout as Guest', exact: true });

export const startMultiShipmentButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Ship to multiple addresses', exact: true });

export const returnToSingleShipmentButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Ship to Single Address', exact: true });

export const assignmentProductImage = (page: Page, productName: string): Locator =>
  page.getByRole('img', { name: `Product image for ${productName}`, exact: true });

export const assignedQuantity = (page: Page): Locator =>
  page.getByText('Quantity: 1', { exact: true }).filter({ visible: true });

export const addNewAddressButton = (page: Page, productName: string): Locator =>
  page.getByRole('button', {
    name: `Add new delivery address for ${productName}`,
    exact: true,
  });

export const firstNameInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'First Name', exact: true });

export const lastNameInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Last Name', exact: true });

export const phoneInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Phone', exact: true });

export const addressInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Address', exact: true });

export const cityInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'City', exact: true });

export const stateSelect = (page: Page): Locator => page.getByLabel('State', { exact: true });

export const zipCodeInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Zip Code', exact: true });

export const saveAddressButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Save', exact: true });

// The combobox has no product-specific accessible name; its adjacent product-specific button is
// the only stable contract that scopes it, so one parent traversal is required.
export const deliveryAddressSelect = (page: Page, productName: string): Locator =>
  addNewAddressButton(page, productName)
    .locator('..')
    .getByRole('combobox', { name: 'Delivery Address', exact: true });

export const selectedDeliveryAddress = (
  page: Page,
  productName: string,
  addressLabel: string,
): Locator =>
  deliveryAddressSelect(page, productName).getByRole('option', {
    name: addressLabel,
    selected: true,
  });

export const deliveryAddressOption = (
  page: Page,
  productName: string,
  addressLabel: string,
): Locator =>
  deliveryAddressSelect(page, productName).getByRole('option', {
    name: addressLabel,
    exact: true,
  });

// Multi-address step reuses the same accessible name as single-ship checkout; test id is the
// stable contract that targets only the multi-shipment continue control.
export const continueToShippingButton = (page: Page): Locator =>
  page.getByTestId('continue-to-shipping-button');

export const multipleAddressesSummary = (page: Page): Locator =>
  page.getByText('Your items will be shipped to multiple addresses.', { exact: true });

export const editShippingOptionsButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Edit Shipping Options', exact: true });

export const shippingMethodOption = (page: Page, methodName: string, index: number): Locator =>
  page.getByText(methodName, { exact: true }).nth(index);

export const shippingMethodRadio = (page: Page, methodName: string, index: number): Locator =>
  page.getByRole('radio', { name: methodName }).nth(index);

export const shippingMethodGroups = (page: Page): Locator => page.getByRole('radiogroup');

export const continueToPaymentButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Continue to Payment', exact: true });

export const editShippingAddressesButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Edit Shipping Addresses', exact: true });

export const editShippingAddressButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Edit Shipping Address', exact: true });

export const shippingSummaryMethod = (page: Page, methodName: string): Locator =>
  page.getByText(methodName, { exact: true });

export const cardNumberInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Card Number', exact: true });

export const nameOnCardInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Name on Card', exact: true });

export const expirationDateInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Expiration Date', exact: true });

export const securityCodeInput = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Security Code', exact: true });

export const reviewOrderButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Review Order', exact: true });

export const placeOrderButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Place Order', exact: true }).first();

export const confirmationHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Thank you for your order!', exact: true, level: 1 });

export const orderNumber = (page: Page): Locator =>
  page.getByText(/^Order Number: \d{8}$/, { exact: true });

export const confirmationDeliveries = (page: Page): Locator =>
  page.getByRole('heading', { name: /^Delivery \d+$/, level: 3 });

// Confirmation exposes no semantic shipment container. Filtering divs by recipient and product
// link selects the smallest rendered fulfillment group without depending on generated class names.
export const confirmationShipmentItem = (
  page: Page,
  recipient: string,
  productName: string,
): Locator =>
  page
    .locator('div')
    .filter({ has: page.getByText(recipient, { exact: true }) })
    .filter({ has: page.getByRole('link', { name: productName, exact: true }) })
    .last();
