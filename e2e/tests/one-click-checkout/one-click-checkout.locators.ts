import type { Locator, Page } from '@playwright/test';

// The one-click page reuses the checkout container test id. What tells the two
// implementations apart is the controls inside it. One-click carries its own
// place-order button and saved-payment controls, not numbered toggle-card steps.

export const oneClickContainer = (page: Page): Locator => page.getByTestId('sf-checkout-container');

export const checkoutSkeleton = (page: Page): Locator => page.getByTestId('sf-checkout-skeleton');

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
// the signal that an add finished rather than that its dialog rendered.
export const miniCart = (page: Page, label: string): Locator =>
  page.getByRole('button', { name: label }).first();

const authForm = (page: Page): Locator => page.getByTestId('sf-auth-modal-form');

export const signinEmail = (page: Page): Locator => authForm(page).getByLabel('Email');

export const usePasswordMethod = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Password', exact: true });

export const signinPassword = (page: Page): Locator =>
  authForm(page).getByLabel('Password', { exact: true });

export const signInButton = (page: Page): Locator =>
  authForm(page).getByRole('button', { name: 'Sign In', exact: true });

// Identity: a returning shopper reaches the one-click page already authenticated,
// so the page offers to sign them out rather than to verify a token.
export const signOut = (page: Page): Locator =>
  oneClickContainer(page).getByRole('button', { name: 'Sign Out' });

export const contactInfoHeading = (page: Page): Locator =>
  oneClickContainer(page).getByRole('heading', { name: 'Contact Info' });

export const savedAddressText = (page: Page, text: string): Locator =>
  oneClickContainer(page).getByText(text).first();

export const continueToShippingAddress = (page: Page): Locator =>
  page.getByRole('button', { name: 'Continue to Shipping Address' });

export const continueToShippingMethod = (page: Page): Locator =>
  page.getByRole('button', { name: /continue to shipping method/i }).first();

export const shippingOptionsForm = (page: Page): Locator =>
  page.getByTestId('sf-checkout-shipping-options-form');

export const continueToPayment = (page: Page): Locator =>
  page.getByRole('button', { name: 'Continue to Payment' });

// Payment: the one-click page renders one payment component rather than a
// numbered step, and offers to keep whatever card is entered.
export const paymentComponent = (page: Page): Locator => page.getByTestId('payment-component');

export const cardNumber = (page: Page): Locator =>
  paymentComponent(page).getByLabel('Card Number', { exact: true });

export const cardHolder = (page: Page): Locator =>
  paymentComponent(page).getByLabel('Name on Card', { exact: true });

export const cardExpiry = (page: Page): Locator =>
  paymentComponent(page).getByLabel('Expiration Date', { exact: true });

export const cardSecurityCode = (page: Page): Locator =>
  paymentComponent(page).getByLabel('Security Code', { exact: true });

export const savePaymentMethod = (page: Page, label: string): Locator =>
  paymentComponent(page).getByRole('checkbox', { name: label });

export const placeOrder = (page: Page): Locator => page.getByTestId('place-order-button');

export const confirmationContainer = (page: Page): Locator =>
  page.getByTestId('sf-checkout-confirmation-container');

export const thankYouHeading = (page: Page): Locator =>
  confirmationContainer(page).getByRole('heading', { name: /thank you for your order/i });

export const orderNumberLine = (page: Page): Locator =>
  confirmationContainer(page)
    .getByText(/order number:/i)
    .first();

export const confirmationText = (page: Page, text: string): Locator =>
  confirmationContainer(page).getByText(text).first();
