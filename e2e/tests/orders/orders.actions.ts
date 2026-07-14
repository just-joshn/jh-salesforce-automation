import type { APIRequestContext, Page } from '@playwright/test';
import { findOrderableVariants } from '../../../api/support/products';
import { bearer, shopperApiUrl, withSite } from '../../../api/support/scapi';
import { getGuestToken, loginRegisteredShopper } from '../../../api/support/slas';
import { buildPath } from '../../support/site';
import type { Credentials } from './orders.data';
import { orderAddress, orderMasterId } from './orders.data';
import * as Locators from './orders.locators';

const BASKETS = 'checkout/shopper-baskets/v1';

// Create a shopper with exactly one past order straight through the data API and return its order
// number, leaving the browser test free to focus on the signed-in "view my orders" journey.
export const provisionCustomerWithOrder = async (
  request: APIRequestContext,
  credentials: Credentials,
): Promise<string> => {
  const { accessToken: guestToken } = await getGuestToken(request);
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

  const { accessToken } = await loginRegisteredShopper(
    request,
    credentials.email,
    credentials.password,
  );
  if (!accessToken) throw new Error('registered login failed while provisioning the order');
  const authed = { params: withSite(), headers: bearer(accessToken) };

  // Order a variant that is in stock right now; a hardcoded variant goes stale as stock drains.
  const [variant] = await findOrderableVariants(request, accessToken, {
    masterId: orderMasterId,
    minCount: 1,
  });
  if (!variant) throw new Error('expected an orderable variant to provision the order with');

  const created = (await (
    await request.post(shopperApiUrl(BASKETS, 'baskets'), { ...authed, data: {} })
  ).json()) as { basketId: string };
  const id = created.basketId;
  const added = await request.post(shopperApiUrl(BASKETS, `baskets/${id}/items`), {
    ...authed,
    data: [{ productId: variant.variantId, quantity: 1 }],
  });
  if (!added.ok()) {
    throw new Error(
      `adding ${variant.variantId} to the basket failed (${added.status()}): ${await added.text()}`,
    );
  }
  await request.put(shopperApiUrl(BASKETS, `baskets/${id}/customer`), {
    ...authed,
    data: { email: credentials.email },
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
  const orderResponse = await request.post(shopperApiUrl('checkout/shopper-orders/v1', 'orders'), {
    ...authed,
    data: { basketId: id },
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
