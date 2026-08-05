import type { APIRequestContext } from '@playwright/test';
import { findOrderableVariants } from '../../../api/support/products';
import { bearer, shopperApiUrl, withSite } from '../../../api/support/scapi';
import { getGuestToken, loginRegisteredShopper } from '../../../api/support/slas';

export interface Credentials {
  email: string;
  password: string;
}

export interface OrderAddress {
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  stateCode: string;
  postalCode: string;
  countryCode: string;
  phone: string;
}

export const password = 'Test1234!';

export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

// A throwaway shopper per run so parallel tests never share order history.
export const newCredentials = (): Credentials => ({ email: uniqueEmail(), password });

// Address used when API places the order.
export const orderAddress: OrderAddress = {
  firstName: 'Test',
  lastName: 'Portfolio',
  address1: '415 Mission St',
  city: 'San Francisco',
  stateCode: 'CA',
  postalCode: '94105',
  countryCode: 'US',
  phone: '4155551234',
};

// Main product id. Provisioning picks an in-stock size at run time.
export const orderMasterId = '25591139M';

// A guest asking for order history is bounced to the login route.
export const loginUrlPattern = /\/login/;

// Opening an order lands on that order's detail route.
export const orderDetailUrlPattern = (orderNo: string): RegExp =>
  new RegExp(`/account/orders/${orderNo}`);

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
  const created = await request.post(shopperApiUrl('customer/shopper-customers/v1', 'customers'), {
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
  if (!created.ok()) {
    throw new Error(
      `registering ${credentials.email} failed (${created.status()}): ${await created.text()}`,
    );
  }
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

const submitOrder = async (
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

// API: make a shopper with one order. Browser test only views orders.
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

  // Order a size that is in stock right now.
  const [variant] = await findOrderableVariants(request, accessToken, {
    masterId: orderMasterId,
    minCount: 1,
  });
  if (!variant) throw new Error('expected an orderable variant to provision the order with');

  const basketId = await createBasketWithItem(request, authed, variant.variantId);
  await configureCheckout(request, authed, basketId, credentials.email);
  return submitOrder(request, authed, basketId);
};
