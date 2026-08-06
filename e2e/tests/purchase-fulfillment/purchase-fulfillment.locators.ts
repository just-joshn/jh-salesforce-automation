import type { Locator, Page } from '@playwright/test';

export const productDetail = (page: Page): Locator => page.getByTestId('product-details-page');

// Scoped to the product view so the Recently Viewed carousel's own option
// pickers don't collide.
export const variationGroup = (page: Page, attribute: string): Locator =>
  page.getByTestId('product-view').getByRole('radiogroup', { name: attribute }).first();

export const colorOption = (page: Page, color: string): Locator =>
  variationGroup(page, 'Color').getByRole('radio', { name: color, exact: true });

// exact so "L" does not match "XL"
export const sizeOption = (page: Page, size: string): Locator =>
  variationGroup(page, 'size').getByRole('radio', { name: size, exact: true });

// Shelf stock message, e.g. "In stock at Woburn Retail Store".
export const storeStockMessage = (page: Page, message: string): Locator =>
  page.getByText(message, { exact: true }).first();

// The fulfillment choices use the Chakra visually-hidden input pattern: a 1px
// clipped radio with no accessible name. The label text is the clickable handle,
// and the input carries the state worth asserting.
export const pickupOption = (page: Page, label: string): Locator =>
  page.getByText(label, { exact: true }).first();

export const pickupRadio = (page: Page): Locator =>
  page.getByRole('radio', { name: /pick up in store/i }).first();

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
// the signal that an add finished rather than that its dialog rendered.
export const miniCart = (page: Page, label: string): Locator =>
  page.getByRole('button', { name: label }).first();

export const selectStoreButton = (page: Page): Locator =>
  page.getByRole('button', { name: /select store/i }).first();

export const storeModal = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: 'Find a Store' });

// The only <select> in the modal, and it carries no label element.
export const storeCountry = (page: Page): Locator => storeModal(page).getByRole('combobox');

export const storePostalCode = (page: Page): Locator =>
  storeModal(page).getByPlaceholder('Enter postal code');

export const storeFind = (page: Page): Locator =>
  storeModal(page).getByRole('button', { name: /^find$/i });

// Same visually-hidden radio pattern as the pickup choice. The wrapping label is
// the clickable handle, and its input value is the store id the Stores API gave.
export const storeChoice = (page: Page, storeId: string): Locator =>
  storeModal(page).locator(`label.chakra-radio:has(input[value="${storeId}"])`).first();

export const storeModalClose = (page: Page): Locator =>
  storeModal(page).getByRole('button', { name: 'Close', exact: true }).first();

export const cartContainer = (page: Page): Locator => page.getByTestId('sf-cart-container');

export const cartHeading = (page: Page, heading: string): Locator =>
  cartContainer(page).getByRole('heading', { name: heading });

export const fulfillmentGroup = (page: Page, label: string): Locator =>
  cartContainer(page).getByText(label);

export const cartText = (page: Page, text: string): Locator =>
  cartContainer(page).getByText(text).first();

export const cartItem = (page: Page, variantId: string): Locator =>
  page.getByTestId(`sf-cart-item-${variantId}`);

// Each line keeps its own fulfillment picker. The cart renders one per breakpoint.
export const itemFulfillment = (page: Page, variantId: string): Locator =>
  cartItem(page, variantId).getByTestId('delivery-option-select').filter({ visible: true }).first();

export const proceedToCheckout = (page: Page): Locator =>
  page
    .getByRole('link', { name: /proceed to checkout/i })
    .filter({ visible: true })
    .first();

export const checkoutContainer = (page: Page): Locator => page.getByTestId('sf-checkout-container');

// Every checkout step is a toggle card. A mixed pickup-and-delivery order renders
// two cards under the same step id, so a card is found by its heading.
export const stepCard = (page: Page, title: string): Locator =>
  page
    .locator('[data-testid^="sf-toggle-card-step-"]')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    .first();

export const emailInput = (page: Page): Locator =>
  checkoutContainer(page).getByLabel('Email', { exact: true });

export const checkoutAsGuest = (page: Page): Locator =>
  page.getByRole('button', { name: /checkout as guest/i });

export const editContactInfo = (page: Page): Locator =>
  page.getByRole('button', { name: 'Edit Contact Info' });

export const signOut = (page: Page): Locator =>
  checkoutContainer(page).getByRole('button', { name: 'Sign Out' });

const authForm = (page: Page): Locator => page.getByTestId('sf-auth-modal-form');

export const signinEmail = (page: Page): Locator => authForm(page).getByLabel('Email');

export const usePasswordMethod = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Password', exact: true });

export const signinPassword = (page: Page): Locator =>
  authForm(page).getByLabel('Password', { exact: true });

export const signInButton = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Sign In', exact: true });

export const shippingAddressForm = (page: Page): Locator =>
  stepCard(page, 'Shipping Address').getByTestId('sf-shipping-address-edit-form');

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

export const continueToShippingMethod = (page: Page): Locator =>
  page
    .getByRole('button', { name: /continue to shipping method/i })
    .filter({ visible: true })
    .first();

export const savedAddressCard = (page: Page, index: number): Locator =>
  page.getByTestId(`sf-checkout-shipping-address-${index}`);

// The saved-address cards are the same visually-hidden radio pattern. The input
// value is the address id the customer's address book holds.
export const savedAddressRadio = (page: Page, addressId: string): Locator =>
  page.locator(`input[type="radio"][value="${addressId}"]`).first();

export const shipToMultipleAddresses = (page: Page): Locator =>
  page.getByRole('button', { name: 'Ship to Multiple Addresses' });

export const multiShippingCards = (page: Page): Locator => page.getByTestId('multi-shipping-card');

export const multiShippingCardFor = (page: Page, productName: string): Locator =>
  multiShippingCards(page).filter({ hasText: productName });

export const addNewAddress = (card: Locator): Locator =>
  card.getByRole('button', { name: /add new delivery address/i });

export const multiAddressForm = (card: Locator): Locator => card.getByTestId('address-form');

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

export const shippingMethodChoices = (page: Page): Locator =>
  shippingOptionsForm(page).getByRole('radio');

export const shipmentHeading = (page: Page, label: string): Locator =>
  shippingOptionsForm(page).getByText(label).first();

export const continueToPayment = (page: Page): Locator =>
  page.getByRole('button', { name: /continue to payment/i });

export const paymentStep = (page: Page): Locator =>
  page.getByTestId('sf-toggle-card-step-3-content');

export const cardNumber = (page: Page): Locator =>
  paymentStep(page).getByLabel('Card Number', { exact: true });

export const cardHolder = (page: Page): Locator =>
  paymentStep(page).getByLabel('Name on Card', { exact: true });

export const cardExpiry = (page: Page): Locator =>
  paymentStep(page).getByLabel('Expiration Date', { exact: true });

export const cardSecurityCode = (page: Page): Locator =>
  paymentStep(page).getByLabel('Security Code', { exact: true });

export const billingSameAsShipping = (page: Page): Locator =>
  paymentStep(page).getByRole('checkbox', { name: 'Same as shipping address' });

export const billingAddressForm = (page: Page): Locator =>
  paymentStep(page).getByTestId('sf-shipping-address-edit-form');

export const reviewOrder = (page: Page): Locator =>
  page.getByRole('button', { name: /review order/i }).first();

export const placeOrder = (page: Page): Locator => page.getByTestId('sf-checkout-place-order-btn');

export const confirmationContainer = (page: Page): Locator =>
  page.getByTestId('sf-checkout-confirmation-container');

export const thankYouHeading = (page: Page): Locator =>
  confirmationContainer(page).getByRole('heading', { name: /thank you for your order/i });

export const orderNumberLine = (page: Page): Locator =>
  confirmationContainer(page)
    .getByText(/order number:/i)
    .first();

export const confirmationHeading = (page: Page, name: string): Locator =>
  confirmationContainer(page).getByRole('heading', { name, exact: true });

export const confirmationText = (page: Page, text: string): Locator =>
  confirmationContainer(page).getByText(text).first();

export const orderHistoryPage = (page: Page): Locator =>
  page.getByTestId('account-order-history-page');

export const orderHistoryEntry = (page: Page, label: string): Locator =>
  orderHistoryPage(page).getByText(label).first();
