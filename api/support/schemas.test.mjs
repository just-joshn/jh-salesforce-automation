import assert from 'node:assert/strict';
import {
  appConfigSchema,
  basketSchema,
  customerOrdersResponseSchema,
  customerProductListSchema,
  customerProductListsResponseSchema,
  customerProductListItemSchema,
  customerRegistrationSchema,
  mobifyDataSchema,
  orderSchema,
  problemDetailSchema,
  productSearchSchema,
  searchSuggestionSchema,
  shippingMethodsSchema,
  storeSearchResponseSchema,
  tokenResponseSchema,
} from './schemas.ts';
import { parseJson } from './response.ts';

const validBasket = {
  basketId: 'test-basket',
  currency: 'USD',
  orderTotal: null,
  shipments: [{ shipmentId: 'me', shippingTotal: null }],
  productItems: [
    {
      itemId: 'item-1',
      productId: '013742002799M',
      quantity: 1,
      price: 65,
      shipmentId: 'me',
    },
  ],
};

const validListItem = {
  id: 'item-1',
  productId: '013742002799M',
  quantity: 1,
};

const validList = {
  id: 'list-1',
  type: 'wish_list',
  customerProductListItems: [validListItem],
};

const validAppConfig = {
  multishipEnabled: true,
  commerceAgent: {
    enabled: 'false',
    askAgentOnSearch: 'false',
    enableAgentFromHeader: 'false',
    enableAgentFromFloatingButton: 'false',
    enableAgentFromSearchSuggestions: 'false',
  },
  sfPayments: { enabled: false, sdkUrl: '', metadataUrl: '' },
  oneClickCheckout: { enabled: false },
  login: {
    passwordless: { enabled: true, mode: 'email', landingPath: '/passwordless-login-landing' },
    social: { enabled: true, idps: ['google', 'apple'], redirectURI: '/social-callback' },
    resetPassword: { mode: 'email', landingPath: '/reset-password' },
  },
  sites: [
    {
      id: 'RefArchGlobal',
      l10n: {
        supportedLocales: [{ id: 'en-US', preferredCurrency: 'USD' }],
        defaultLocale: 'en-US',
      },
    },
  ],
};

const assertValid = (schema, value, label) => {
  assert.equal(schema.safeParse(value).success, true, `${label} should be valid`);
};

const assertInvalid = (schema, value, label) => {
  assert.equal(schema.safeParse(value).success, false, `${label} should be invalid`);
};

assertValid(basketSchema, validBasket, 'basket with nullable totals');
assertInvalid(basketSchema, { ...validBasket, basketId: 42 }, 'basket with invalid id');

assertValid(
  tokenResponseSchema,
  { access_token: 'access', usid: 'usid', customer_id: 'customer' },
  'token response',
);
assertInvalid(
  tokenResponseSchema,
  { access_token: 'access', usid: 'usid' },
  'token without customer id',
);

assertValid(
  problemDetailSchema,
  { title: 'Bad request', detail: 'Invalid email' },
  'problem detail',
);
assertValid(mobifyDataSchema, { __CONFIG__: { app: { multishipEnabled: true } } }, 'mobify data');
assertInvalid(mobifyDataSchema, { __CONFIG__: {} }, 'mobify data without app');
assertValid(appConfigSchema, validAppConfig, 'storefront app config');
assertInvalid(
  appConfigSchema,
  { ...validAppConfig, multishipEnabled: 'true' },
  'storefront app config with invalid flag',
);
assertValid(
  customerRegistrationSchema,
  { customerId: 'customer', authType: 'registered' },
  'registration response',
);
assertInvalid(
  customerRegistrationSchema,
  { customerId: 'customer' },
  'registration without auth type',
);

assertValid(customerProductListItemSchema, validListItem, 'wishlist item');
assertInvalid(
  customerProductListItemSchema,
  { id: 'item-1', productId: '013742002799M' },
  'wishlist item without quantity',
);
assertValid(customerProductListSchema, validList, 'wishlist');
assertValid(customerProductListsResponseSchema, { data: [validList] }, 'wishlist collection');
assertValid(customerProductListsResponseSchema, {}, 'empty wishlist collection');
assertInvalid(
  customerProductListsResponseSchema,
  { data: { id: 'not-an-array' } },
  'wishlist collection with invalid data',
);

assertValid(customerOrdersResponseSchema, { data: [{ orderNo: '00000001' }] }, 'order collection');
assertInvalid(customerOrdersResponseSchema, { data: [{}] }, 'order without order number');

assertValid(orderSchema, { orderNo: '00000001', orderTotal: null }, 'order');
assertInvalid(orderSchema, { orderTotal: 0 }, 'order without order number');
assertValid(
  shippingMethodsSchema,
  { applicableShippingMethods: [{ id: '001', name: 'Ground', price: 5.99 }] },
  'shipping methods',
);
assertInvalid(
  shippingMethodsSchema,
  { applicableShippingMethods: [{}] },
  'invalid shipping method',
);
assertValid(
  searchSuggestionSchema,
  { productSuggestions: { products: [{ productId: 'sku-1', productName: 'Demo' }] } },
  'search suggestions',
);
assertValid(productSearchSchema, { total: 0, hits: [] }, 'empty product search');
assertValid(productSearchSchema, { total: 0 }, 'zero-result search without hits');
assertInvalid(productSearchSchema, { hits: [] }, 'product search without total');

assertValid(
  storeSearchResponseSchema,
  {
    data: [
      {
        id: 'store-1',
        name: 'Demo Store',
        phone: '4155550100',
        address1: '1 Market Street',
        city: 'San Francisco',
        stateCode: 'CA',
        postalCode: '94103',
      },
    ],
  },
  'store search',
);
assertInvalid(storeSearchResponseSchema, { data: [{ id: 'store-1' }] }, 'store without name');


const jsonResponse = (payload, contentType = 'application/json') => ({
  headers: () => ({ 'content-type': contentType }),
  json: async () => payload,
});

const parsed = await parseJson(jsonResponse(validBasket), basketSchema, 'basket contract');
assert.deepEqual(parsed, validBasket);
await assert.rejects(
  () => parseJson(jsonResponse({ basketId: 42 }), basketSchema, 'basket contract'),
  /basket contract response contract failed/,
);
await assert.rejects(
  () => parseJson(jsonResponse(validBasket, 'text/html'), basketSchema, 'basket contract'),
  /basket contract response content type must be JSON/,
);

console.log('zod contract checks passed');
