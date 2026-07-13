import { expect, type APIResponse } from '@playwright/test';
import { env, withLocale, withSite } from './env';
import { ScapiClient } from './scapi-client';
import type { Basket, Shipment } from './scapi-types';
import type { AddressInput, CreditCardInput } from './test-data';
import type { PickupStore } from './store-types';
import { parseJson } from './response';
import {
  basketSchema,
  customerBasketsResponseSchema,
  shipmentSchema,
  shippingMethodsSchema,
} from './schemas';

// The storefront itself calls item-level and shipment-level basket resources on v2 while
// it patches the basket root on v1 — both confirmed live from the browser's own traffic.
const V2 = 'checkout/shopper-baskets/v2';
const V1 = 'checkout/shopper-baskets/v1';

/** Shared shape for the JSON address bodies the checkout flows PUT/PATCH. */
type AddressBody = Record<string, string>;

const addressBody = (address: AddressInput): AddressBody => ({
  firstName: address.firstName,
  lastName: address.lastName,
  phone: `(${address.phone.slice(0, 3)}) ${address.phone.slice(3, 6)}-${address.phone.slice(6)}`,
  countryCode: 'US',
  address1: address.address,
  city: address.city,
  stateCode: address.stateCode,
  postalCode: address.zip,
});

/** The Shopper Baskets family: cart mutations plus the checkout wizard's basket writes. */
export class BasketsClient extends ScapiClient {
  // --- Cart (D) ----------------------------------------------------------------------

  /** Creates a basket, then pins its currency to the selected storefront profile. */
  async createBasket(accessToken: string): Promise<Basket> {
    const create = await this.request.post(this.apiUrl(V2, 'baskets'), {
      headers: this.json(accessToken),
      params: withLocale(),
      data: {},
    });
    expect(create.status(), 'create basket').toBe(200);
    const basket = await parseJson<Basket>(create, basketSchema, 'create basket');

    // The storefront immediately PATCHes the basket root (on v1) to its configured
    // currency. Skipping that pin would price every later step wrong.
    const patch = await this.request.patch(this.apiUrl(V1, `baskets/${basket.basketId}`), {
      headers: this.json(accessToken),
      params: withLocale(),
      data: { currency: env.E2E_CURRENCY },
    });
    expect(patch.status(), 'set basket currency').toBe(200);
    return basket;
  }

  /** D1/E*: adds a line item. `productId` must be the concrete variant — SCAPI rejects masters. */
  async addItem(
    accessToken: string,
    basketId: string,
    productId: string,
    price: number,
    quantity = 1,
    inventoryId?: string,
  ): Promise<Basket> {
    const response = await this.request.post(this.apiUrl(V2, `baskets/${basketId}/items`), {
      headers: this.json(accessToken),
      params: withLocale(),
      data: [
        {
          productId,
          price,
          quantity,
          ...(inventoryId ? { inventoryId } : {}),
          shipmentId: 'me',
        },
      ],
    });
    expect(response.status(), 'add basket item').toBe(200);
    return parseJson<Basket>(response, basketSchema, 'add basket item');
  }

  /** D1: the debounced quantity change the cart stepper issues. */
  async updateItemQuantity(
    accessToken: string,
    basketId: string,
    itemId: string,
    quantity: number,
  ): Promise<Basket> {
    const response = await this.request.patch(
      this.apiUrl(V2, `baskets/${basketId}/items/${itemId}`),
      {
        headers: this.json(accessToken),
        params: withLocale(),
        data: { quantity },
      },
    );
    expect(response.status(), 'update item quantity').toBe(200);
    return parseJson<Basket>(response, basketSchema, 'update item quantity');
  }

  /** D1: removes a line item (200, not 204, on this API). */
  async removeItem(accessToken: string, basketId: string, itemId: string): Promise<APIResponse> {
    const response = await this.request.delete(
      this.apiUrl(V2, `baskets/${basketId}/items/${itemId}`),
      {
        headers: this.authed(accessToken),
        params: withLocale(),
      },
    );
    expect(response.status(), 'remove basket item').toBe(200);
    return response;
  }

  /** D2: the login-triggered guest->registered basket merge. */
  async mergeBaskets(accessToken: string): Promise<Basket> {
    const response = await this.request.post(this.apiUrl(V2, 'baskets/actions/merge'), {
      headers: this.authed(accessToken),
      params: withLocale({ createDestinationBasket: 'true' }),
    });
    expect(response.status(), 'merge baskets').toBe(200);
    return parseJson<Basket>(response, basketSchema, 'merge baskets');
  }

  // --- Checkout wizard (E) ------------------------------------------------------------

  /** E1/E3: sets the guest contact email on the basket. */
  async setCustomerEmail(
    accessToken: string,
    basketId: string,
    email: string,
  ): Promise<APIResponse> {
    const response = await this.request.put(this.apiUrl(V2, `baskets/${basketId}/customer`), {
      headers: this.json(accessToken),
      params: withLocale(),
      data: { email },
    });
    expect(response.status(), 'set customer email').toBe(200);
    return response;
  }

  async getShippingMethods(accessToken: string, basketId: string, shipmentId: string) {
    const response = await this.request.get(
      this.apiUrl(V2, `baskets/${basketId}/shipments/${shipmentId}/shipping-methods`),
      { headers: this.authed(accessToken), params: withLocale() },
    );
    expect(response.status()).toBe(200);
    return parseJson<{
      applicableShippingMethods: { id: string; name: string; price: number }[];
    }>(response, shippingMethodsSchema, 'get shipping methods');
  }

  /** E1: single-address checkout — sets the shipping address on shipment "me". */
  async setShippingAddress(
    accessToken: string,
    basketId: string,
    address: AddressInput,
  ): Promise<APIResponse> {
    const response = await this.request.patch(this.apiUrl(V2, `baskets/${basketId}/shipments/me`), {
      headers: this.json(accessToken),
      params: withLocale(),
      data: { shippingAddress: addressBody(address) },
    });
    expect(response.status(), 'set shipping address').toBe(200);
    return response;
  }

  /** E1: selects a shipping method (001 = Ground on this site) for a shipment. */
  async setShippingMethod(
    accessToken: string,
    basketId: string,
    shipmentId: string,
    methodId: string,
  ): Promise<APIResponse> {
    const response = await this.request.put(
      this.apiUrl(V2, `baskets/${basketId}/shipments/${shipmentId}/shipping-method`),
      {
        headers: this.json(accessToken),
        params: withLocale(),
        data: { id: methodId },
      },
    );
    expect(response.status(), 'set shipping method').toBe(200);
    return response;
  }

  // --- E2: Buy Online Pick Up In Store --------------------------------------------------

  /**
   * E2: converts the "me" shipment to store pickup, exactly as the storefront does —
   * the advertised Store Pickup method, `c_fromStoreId` naming the store, and the store's
   * own address standing in as the shipment address.
   */
  async setPickupShipment(
    accessToken: string,
    basketId: string,
    store: PickupStore,
  ): Promise<APIResponse> {
    const methods = await this.getShippingMethods(accessToken, basketId, 'me');
    const pickupMethod = methods.applicableShippingMethods.find((method) =>
      /store pickup|pick up in store/i.test(method.name),
    );
    if (!pickupMethod) {
      throw new Error(`No applicable store pickup method for basket ${basketId}`);
    }

    const response = await this.request.patch(this.apiUrl(V2, `baskets/${basketId}/shipments/me`), {
      headers: this.json(accessToken),
      params: withLocale(),
      data: {
        shippingMethod: { id: pickupMethod.id },
        c_fromStoreId: store.id,
        shippingAddress: {
          address1: store.address1,
          city: store.city,
          countryCode: 'US',
          firstName: store.name,
          lastName: 'pickup',
          phone: store.phone,
          postalCode: store.postalCode,
          stateCode: store.stateCode,
        },
      },
    });
    expect(response.status(), 'set pickup shipment').toBe(200);
    return response;
  }

  // --- E3: multi-shipment ----------------------------------------------------------------

  /**
   * E3: creates the second delivery group. The storefront generates the shipmentId
   * client-side; mirroring that keeps the two groups distinguishable in the order.
   */
  async createShipment(
    accessToken: string,
    basketId: string,
    shipmentId: string,
    address: AddressInput,
  ): Promise<Shipment> {
    const response = await this.request.post(this.apiUrl(V2, `baskets/${basketId}/shipments`), {
      headers: this.json(accessToken),
      params: withLocale(),
      data: { shipmentId, shippingAddress: addressBody(address) },
    });
    expect(response.status(), 'create shipment').toBe(200);
    return parseJson<Shipment>(response, shipmentSchema, 'create shipment');
  }

  /** E3: moves a line item to its delivery group (array-form PATCH on the items root). */
  async moveItemToShipment(
    accessToken: string,
    basketId: string,
    itemId: string,
    productId: string,
    shipmentId: string,
  ): Promise<APIResponse> {
    const response = await this.request.patch(this.apiUrl(V2, `baskets/${basketId}/items`), {
      headers: this.json(accessToken),
      params: withLocale(),
      data: [{ itemId, productId, quantity: 1, shipmentId }],
    });
    expect(response.status(), 'move item to shipment').toBe(200);
    return response;
  }

  // --- Payment ---------------------------------------------------------------------------

  /**
   * E1-E4: registers the credit-card payment instrument. The storefront posts the masked
   * number it produced client-side (never the PAN on this proxied path). Pin the concrete
   * amount afterwards via pinPaymentAmount, once totals are settled — that's the exact
   * order the browser issues these calls in.
   */
  async setCreditCardPayment(
    accessToken: string,
    basketId: string,
    card: CreditCardInput,
  ): Promise<{ instrumentId: string }> {
    const create = await this.request.post(
      this.apiUrl(V2, `baskets/${basketId}/payment-instruments`),
      {
        headers: this.json(accessToken),
        params: withLocale(),
        data: {
          paymentMethodId: 'CREDIT_CARD',
          paymentCard: {
            holder: card.name,
            maskedNumber: `************${card.number.slice(-4)}`,
            cardType: 'Visa',
            expirationMonth: card.expirationMonth,
            expirationYear: card.expirationYear,
          },
        },
      },
    );
    expect(create.status(), 'create payment instrument').toBe(200);
    const basket = await parseJson<Basket>(create, basketSchema, 'create payment instrument');
    const instrument = basket.paymentInstruments?.find(
      (candidate) => candidate.paymentMethodId === 'CREDIT_CARD',
    );
    if (!instrument?.paymentInstrumentId) {
      throw new Error('create payment instrument response carries no instrument id');
    }
    return { instrumentId: instrument.paymentInstrumentId };
  }

  async pinPaymentAmount(
    accessToken: string,
    basketId: string,
    instrumentId: string,
    amount: number,
  ): Promise<APIResponse> {
    const response = await this.request.patch(
      this.apiUrl(V2, `baskets/${basketId}/payment-instruments/${instrumentId}`),
      {
        headers: this.json(accessToken),
        params: withLocale(),
        data: { amount },
      },
    );
    expect(response.status(), 'pin payment amount').toBe(200);
    return response;
  }

  /** E2: the billing address for pickup checkout, where no shipping address exists to copy. */
  async setBillingAddress(
    accessToken: string,
    basketId: string,
    address: AddressInput,
  ): Promise<APIResponse> {
    const response = await this.request.put(
      this.apiUrl(V2, `baskets/${basketId}/billing-address`),
      {
        headers: this.json(accessToken),
        params: withLocale(),
        data: addressBody(address),
      },
    );
    expect(response.status(), 'set billing address').toBe(200);
    return response;
  }

  /** D2/checkout bootstrap: the open-basket lookup the storefront performs per session. */
  async listCustomerBaskets(accessToken: string, customerId: string): Promise<Basket[]> {
    const response = await this.request.get(
      this.apiUrl('customer/shopper-customers/v1', `customers/${customerId}/baskets`),
      { headers: this.authed(accessToken), params: withSite() },
    );
    expect(response.status(), 'list customer baskets').toBe(200);
    const body = await parseJson<{ baskets?: Basket[] }>(
      response,
      customerBasketsResponseSchema,
      'list customer baskets',
    );
    return body.baskets ?? [];
  }

  async getBasket(accessToken: string, basketId: string): Promise<Basket> {
    const response = await this.request.get(this.apiUrl(V2, `baskets/${basketId}`), {
      headers: this.authed(accessToken),
      params: withLocale(),
    });
    expect(response.status()).toBe(200);
    return parseJson<Basket>(response, basketSchema, 'get basket');
  }

  /** Test isolation: removes every line from an open basket. */
  async clearItems(accessToken: string, basketId: string): Promise<void> {
    const basket = await this.getBasket(accessToken, basketId);
    for (const line of basket.productItems ?? []) {
      if (line.itemId) {
        await this.removeItem(accessToken, basketId, line.itemId);
      }
    }
  }
}

export type { PickupStore } from './store-types';
