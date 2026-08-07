import type { Locator, Page } from '@playwright/test';

export const productDetail = (page: Page): Locator => page.getByTestId('product-details-page');

// Scoped to the product view so the Recently Viewed carousel's own option
// pickers don't collide.
const variationGroup = (page: Page, attribute: string): Locator =>
  page.getByTestId('product-view').getByRole('radiogroup', { name: attribute }).first();

export const colorOption = (page: Page, color: string): Locator =>
  variationGroup(page, 'Color').getByRole('radio', { name: color, exact: true });

// exact so "L" does not match "XL"
export const sizeOption = (page: Page, size: string): Locator =>
  variationGroup(page, 'size').getByRole('radio', { name: size, exact: true });

export const addToCartButton = (page: Page): Locator =>
  page
    .getByRole('button', { name: /^add to cart$/i })
    .filter({ visible: true })
    .first();

export const addConfirmation = (page: Page): Locator =>
  page
    .getByRole('dialog')
    .filter({ hasText: /added to cart/i })
    .first();

export const addConfirmationClose = (page: Page): Locator =>
  addConfirmation(page).getByRole('button', { name: 'Close' }).first();

// The header basket button counts what the shop has actually stored, so it is
// the signal that an add finished; a rendered dialog cannot say that.
export const miniCart = (page: Page, label: string): Locator =>
  page.getByRole('button', { name: label }).first();

export const cartContainer = (page: Page): Locator => page.getByTestId('sf-cart-container');

export const fulfillmentGroup = (page: Page, label: string): Locator =>
  cartContainer(page).getByText(label);

export const cartItem = (page: Page, variantId: string): Locator =>
  page.getByTestId(`sf-cart-item-${variantId}`);

export const proceedToCheckout = (page: Page): Locator =>
  page
    .getByRole('link', { name: /proceed to checkout/i })
    .filter({ visible: true })
    .first();

export const checkoutContainer = (page: Page): Locator => page.getByTestId('sf-checkout-container');

export const emailInput = (page: Page): Locator =>
  checkoutContainer(page).getByLabel('Email', { exact: true });

export const checkoutAsGuest = (page: Page): Locator =>
  page.getByRole('button', { name: /checkout as guest/i });

export const editContactInfo = (page: Page): Locator =>
  page.getByRole('button', { name: 'Edit Contact Info' });

const stepCard = (page: Page, title: string): Locator =>
  page
    .locator('[data-testid^="sf-toggle-card-step-"]')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    .first();

export const shippingAddressForm = (page: Page): Locator =>
  stepCard(page, 'Shipping Address').getByTestId('sf-shipping-address-edit-form');

export const shipToMultipleAddresses = (page: Page): Locator =>
  page.getByRole('button', { name: 'Ship to Multiple Addresses' });

export const multiShippingCards = (page: Page): Locator => page.getByTestId('multi-shipping-card');

export const multiShippingCardFor = (page: Page, productName: string): Locator =>
  multiShippingCards(page).filter({ hasText: productName });

export const addNewAddress = (card: Locator): Locator =>
  card.getByRole('button', { name: /add new delivery address/i });

export const multiAddressForm = (card: Locator): Locator => card.getByTestId('address-form');

export const firstNameField = (scope: Locator): Locator =>
  scope.getByLabel('First Name', { exact: true });

export const lastNameField = (scope: Locator): Locator =>
  scope.getByLabel('Last Name', { exact: true });

export const phoneField = (scope: Locator): Locator => scope.getByLabel('Phone', { exact: true });

export const countryField = (scope: Locator): Locator =>
  scope.getByLabel('Country', { exact: true });

export const addressLineField = (scope: Locator): Locator =>
  scope.getByLabel('Address', { exact: true });

export const cityField = (scope: Locator): Locator => scope.getByLabel('City', { exact: true });

export const stateField = (scope: Locator): Locator => scope.getByLabel('State', { exact: true });

export const postalCodeField = (scope: Locator): Locator =>
  scope.getByLabel('Zip Code', { exact: true });

export const saveAddress = (form: Locator): Locator =>
  form.getByRole('button', { name: /^save$/i });

// The address a shipment card currently holds is its selected <option>.
export const selectedAddressFor = (page: Page, productName: string): Locator =>
  multiShippingCardFor(page, productName).locator('option:checked');

export const continueWithAddresses = (page: Page): Locator =>
  page.getByTestId('continue-to-shipping-button');

export const editShippingOptions = (page: Page): Locator =>
  page.getByRole('button', { name: 'Edit Shipping Options' });

export const shippingOptionsForm = (page: Page): Locator =>
  page.getByTestId('sf-checkout-shipping-options-form');

export const continueToPayment = (page: Page): Locator =>
  page.getByRole('button', { name: /continue to payment/i });

const paymentStep = (page: Page): Locator => page.getByTestId('sf-toggle-card-step-3-content');

export const cardNumber = (page: Page): Locator =>
  paymentStep(page).getByLabel('Card Number', { exact: true });

export const cardHolder = (page: Page): Locator =>
  paymentStep(page).getByLabel('Name on Card', { exact: true });

export const cardExpiry = (page: Page): Locator =>
  paymentStep(page).getByLabel('Expiration Date', { exact: true });

export const cardSecurityCode = (page: Page): Locator =>
  paymentStep(page).getByLabel('Security Code', { exact: true });

export const reviewOrder = (page: Page): Locator =>
  page.getByRole('button', { name: /review order/i }).first();

export const placeOrder = (page: Page): Locator => page.getByTestId('sf-checkout-place-order-btn');

// --- The confirmation page, where this journey starts ---

export const confirmationContainer = (page: Page): Locator =>
  page.getByTestId('sf-checkout-confirmation-container');

export const confirmationHeading = (page: Page, name: string): Locator =>
  confirmationContainer(page).getByRole('heading', { name, exact: true });

export const orderNumberLine = (page: Page): Locator =>
  confirmationContainer(page)
    .getByText(/order number:/i)
    .first();

/**
 * The post-checkout account form. It carries no test id of its own, so it is
 * scoped by the heading that introduces it and addressed through its labels.
 */
const accountForm = (page: Page): Locator =>
  confirmationContainer(page)
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Create an account for faster checkout' }) })
    .last();

export const accountEmail = (page: Page): Locator =>
  accountForm(page).getByLabel('Email', { exact: true });

export const accountPassword = (page: Page): Locator =>
  accountForm(page).getByLabel('Password', { exact: true });

export const createAccountButton = (page: Page): Locator =>
  confirmationContainer(page).getByRole('button', { name: 'Create Account', exact: true });

// --- The registered session the journey ends in ---

// Log Out means a registered session is active. It may sit in a menu, so it is
// asserted as attached, never as visible.
export const logout = (page: Page): Locator => page.getByText(/log out/i);

export const profileCard = (page: Page): Locator => page.getByTestId('sf-toggle-card-my-profile');

export const savedAddressesPage = (page: Page): Locator =>
  page.getByTestId('account-addresses-page');

// The address book gives every saved entry its own edit control, named after the
// street it belongs to, so the controls are what count the entries.
export const savedAddressEntries = (page: Page): Locator =>
  savedAddressesPage(page).getByRole('button', { name: /^Edit / });

export const savedAddressEntry = (page: Page, address1: string): Locator =>
  savedAddressesPage(page).getByRole('button', { name: `Edit ${address1}`, exact: true });
