import type { APIRequestContext, Page } from '@playwright/test';
import { findOrderableVariants } from '../../../api/support/products';
import { bearer, shopperApiUrl, withSite } from '../../../api/support/scapi';
import { getGuestToken, loginRegisteredShopper } from '../../../api/support/slas';
import { buildPath } from '../../support/site';
import type { Credentials } from './orders.data';
import { orderAddress, orderMasterId } from './orders.data';
import * as Locators from './orders.locators';

const BASKETS = 'checkout/shopper-baskets/v1';

interface Authed {
  params: ReturnType<typeof withSite>;
  headers: ReturnType<typeof bearer>;
}

const registerCustomer = async (
  request: APIRequestContext,
  guestToken: string,
  credentials: Credentials,
): Promise<void> => {
  await request.post(shopperApiUrl('customer/shopper-customers/v1', 'customers'), {
    params: withSite(),
    headers: bearer(guestToken),
    data: {
      customer: {
        firstName: 'Test',
        lastName: 'Portfolio',
        email: credentials.email,
        login: credentials.email,
      },
      password: credentials.password,
    },
  });
};

const requireToken = (accessToken: string | undefined): string => {
  if (!accessToken) throw new Error('registered login failed while provisioning the order');
  return accessToken;
};

const createBasketWithItem = async (
  request: APIRequestContext,
  authed: Authed,
  variantId: string,
): Promise<string> => {
  const created = (await (
    await request.post(shopperApiUrl(BASKETS, 'baskets'), { ...authed, data: {} })
  ).json()) as { basketId: string };
  const id = created.basketId;
  const added = await request.post(shopperApiUrl(BASKETS, `baskets/${id}/items`), {
    ...authed,
    data: [{ productId: variantId, quantity: 1 }],
  });
  if (!added.ok()) {
    throw new Error(
      `adding ${variantId} to the basket failed (${added.status()}): ${await added.text()}`,
    );
  }
  return id;
};

const configureCheckout = async (
  request: APIRequestContext,
  authed: Authed,
  basketId: string,
  email: string,
): Promise<void> => {
  const id = basketId;
  await request.put(shopperApiUrl(BASKETS, `baskets/${id}/customer`), {
    ...authed,
    data: { email },
  });
  await request.put(shopperApiUrl(BASKETS, `baskets/${id}/shipments/me/shipping-address`), {
    ...authed,
    data: orderAddress,
  });
  await request.put(shopperApiUrl(BASKETS, `baskets/${id}/shipments/me/shipping-method`), {
    ...authed,
    data: { id: 'GBP001' },
  });
  await request.put(shopperApiUrl(BASKETS, `baskets/${id}/billing-address`), {
    ...authed,
    data: orderAddress,
  });
  const priced = (await (
    await request.get(shopperApiUrl(BASKETS, `baskets/${id}`), authed)
  ).json()) as { orderTotal: number };
  await request.post(shopperApiUrl(BASKETS, `baskets/${id}/payment-instruments`), {
    ...authed,
    data: {
      paymentMethodId: 'CREDIT_CARD',
      paymentCard: {
        cardType: 'Visa',
        expirationMonth: 12,
        expirationYear: 2030,
        holder: 'Test Portfolio',
        securityCode: '123',
      },
      amount: priced.orderTotal,
    },
  });
};

const placeOrder = async (
  request: APIRequestContext,
  authed: Authed,
  basketId: string,
): Promise<string> => {
  const orderResponse = await request.post(shopperApiUrl('checkout/shopper-orders/v1', 'orders'), {
    ...authed,
    data: { basketId },
  });
  if (!orderResponse.ok()) {
    throw new Error(
      `placing the order failed (${orderResponse.status()}): ${await orderResponse.text()}`,
    );
  }
  const order = (await orderResponse.json()) as { orderNo?: string };
  if (!order.orderNo) throw new Error('the provisioned order came back without an order number');
  return order.orderNo;
};

// Create a shopper with exactly one past order, entirely through the API, and return the
// order number. The browser test can then focus on the signed-in "view my orders" journey.
export const provisionCustomerWithOrder = async (
  request: APIRequestContext,
  credentials: Credentials,
): Promise<string> => {
  const { accessToken: guestToken } = await getGuestToken(request);
  await registerCustomer(request, guestToken, credentials);

  const { accessToken: rawToken } = await loginRegisteredShopper(
    request,
    credentials.email,
    credentials.password,
  );
  const accessToken = requireToken(rawToken);
  const authed = { params: withSite(), headers: bearer(accessToken) };

  // Order a variant that is in stock right now; a hardcoded one would go stale as stock sells out.
  const [variant] = await findOrderableVariants(request, accessToken, {
    masterId: orderMasterId,
    minCount: 1,
  });
  if (!variant) throw new Error('expected an orderable variant to provision the order with');

  const basketId = await createBasketWithItem(request, authed, variant.variantId);
  await configureCheckout(request, authed, basketId, credentials.email);
  return placeOrder(request, authed, basketId);
};

export const openOrderHistory = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/account/orders'));
};

export const signIn = async (page: Page, credentials: Credentials): Promise<void> => {
  await page.goto(buildPath('/login'));
  await Locators.signinEmail(page).fill(credentials.email);
  await Locators.usePasswordMethod(page).click();
  await Locators.signinPassword(page).fill(credentials.password);
  await Locators.signInButton(page).click();
  await page.waitForURL(/\/account/, { timeout: 20000 });
};

export const openOrderDetail = async (page: Page): Promise<void> => {
  await Locators.viewDetails(page).first().click();
};
