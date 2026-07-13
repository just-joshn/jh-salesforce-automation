import { z } from 'zod';

const loose = <T extends z.ZodRawShape>(shape: T) => z.object(shape).passthrough();
const nullableString = z.string().nullable().optional();

export const mobifyDataSchema = loose({
  __CONFIG__: loose({
    app: z.unknown(),
  }),
});

export const tokenResponseSchema = loose({
  access_token: z.string().min(1),
  usid: z.string().min(1),
  customer_id: z.string().min(1),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
});

export const problemDetailSchema = loose({
  type: z.string().optional(),
  title: z.string().optional(),
  detail: z.string().optional(),
  message: z.string().optional(),
  status: z.number().optional(),
});

const basketItemSchema = loose({
  itemId: z.string().optional(),
  productId: z.string().min(1),
  quantity: z.number(),
  price: z.number().optional(),
  shipmentId: z.string().optional(),
});

export const shipmentSchema = loose({
  shipmentId: z.string().optional(),
  shippingStatus: z.string().optional(),
  shippingTotal: z.number().nullable().optional(),
  trackingNumber: nullableString,
  shippingAddress: z.unknown().optional(),
  shippingMethod: z.object({ id: z.string().optional() }).passthrough().optional(),
});

export const paymentInstrumentSchema = loose({
  paymentMethodId: z.string().optional(),
  paymentInstrumentId: z.string().optional(),
});

export const basketSchema = loose({
  basketId: z.string().min(1),
  currency: z.string().optional(),
  orderTotal: z.number().nullable().optional(),
  productItems: z.array(basketItemSchema).optional(),
  paymentInstruments: z.array(paymentInstrumentSchema).optional(),
  shipments: z.array(shipmentSchema).optional(),
  billingAddress: z.unknown().optional(),
});

const orderItemSchema = loose({
  itemId: z.string().optional(),
  productId: z.string().min(1),
  quantity: z.number().optional(),
  shipmentId: z.string().nullable().optional(),
});

export const shippingMethodsSchema = loose({
  applicableShippingMethods: z.array(
    loose({
      id: z.string().min(1),
      name: z.string(),
      price: z.number(),
    }),
  ),
});

export const customerBasketsResponseSchema = loose({
  baskets: z.array(basketSchema).optional(),
});

export const orderSchema = loose({
  orderNo: z.string().min(1),
  orderTotal: z.number().nullable().optional(),
  customerInfo: z.object({ email: z.string().optional() }).passthrough().optional(),
  productItems: z.array(orderItemSchema).optional(),
  shipments: z.array(shipmentSchema).optional(),
  paymentInstruments: z.array(paymentInstrumentSchema).optional(),
});

export const customerRegistrationSchema = loose({
  customerId: z.string().min(1),
  authType: z.string().min(1),
});

export const customerAddressSchema = loose({
  addressId: z.string().min(1),
  preferred: z.boolean(),
  address1: z.string().min(1),
  city: z.string().min(1),
  stateCode: z.string().min(1),
  postalCode: z.string().min(1),
});

export const customerSchema = loose({
  customerId: z.string().optional(),
  phoneHome: nullableString,
  addresses: z.array(customerAddressSchema).optional(),
});

export const customerProductListItemSchema = loose({
  id: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number(),
});

export const customerProductListSchema = loose({
  id: z.string().min(1),
  type: z.string().min(1),
  customerProductListItems: z.array(customerProductListItemSchema).optional(),
});

export const customerProductListsResponseSchema = loose({
  // The live API omits data when the customer has no product lists yet.
  data: z.array(customerProductListSchema).optional(),
});

export const customerAddressesResponseSchema = loose({
  data: z.array(customerAddressSchema).optional(),
});

export const customerOrdersResponseSchema = loose({
  data: z.array(
    loose({
      orderNo: z.string().min(1),
    }),
  ),
});

const suggestionProductSchema = loose({
  productName: z.string().optional(),
  productId: z.string().optional(),
});

export const searchSuggestionSchema = loose({
  productSuggestions: loose({
    products: z.array(suggestionProductSchema).optional(),
  }).optional(),
  categorySuggestions: loose({
    categories: z
      .array(
        loose({
          name: z.string().optional(),
        }),
      )
      .optional(),
  }).optional(),
});

const searchHitSchema = loose({
  productId: z.string().optional(),
  productName: z.string().optional(),
  currency: z.string().optional(),
});

export const productSearchSchema = loose({
  total: z.number(),
  // The live API omits hits for some zero-result queries instead of returning [].
  hits: z.array(searchHitSchema).optional(),
});

export const storeSearchResponseSchema = loose({
  data: z.array(
    loose({
      id: z.string().min(1),
      name: z.string().min(1),
      phone: z.string().optional(),
      address1: z.string().optional(),
      city: z.string().optional(),
      stateCode: z.string().optional(),
      postalCode: z.string().optional(),
      distance: z.number().optional(),
    }),
  ),
});

export const productSchema = loose({
  id: z.string().min(1),
  currency: z.string().optional(),
  name: z.string().optional(),
});

export const categorySchema = loose({
  id: z.string().min(1),
  name: z.string().min(1),
});

const supportedLocaleSchema = loose({
  id: z.string().min(1),
  preferredCurrency: z.string().min(1),
});

export const appConfigSchema = loose({
  multishipEnabled: z.boolean(),
  commerceAgent: loose({
    enabled: z.string().default('false'),
    askAgentOnSearch: z.string().default('false'),
    enableAgentFromHeader: z.string().default('false'),
    enableAgentFromFloatingButton: z.string().default('false'),
    enableAgentFromSearchSuggestions: z.string().default('false'),
  }),
  sfPayments: loose({
    enabled: z.boolean(),
    sdkUrl: z.string(),
    metadataUrl: z.string(),
  }),
  oneClickCheckout: loose({
    enabled: z.boolean(),
  }),
  login: loose({
    passwordless: loose({
      enabled: z.boolean(),
      mode: z.string(),
      landingPath: z.string(),
    }),
    social: loose({
      enabled: z.boolean(),
      idps: z.array(z.string()),
      redirectURI: z.string(),
    }),
    resetPassword: loose({
      mode: z.string(),
      landingPath: z.string(),
    }),
  }),
  sites: z.array(
    loose({
      id: z.string(),
      l10n: loose({
        supportedLocales: z.array(supportedLocaleSchema),
        defaultLocale: z.string(),
      }),
    }),
  ),
});
