import { expect, type APIResponse } from '@playwright/test';
import { withLocale, withSite } from './env';
import { ScapiClient } from './scapi-client';
import type { Order } from './scapi-types';
import { parseJson } from './response';
import { orderSchema, problemDetailSchema } from './schemas';

const FAMILY = 'checkout/shopper-orders/v1';

/** The Shopper Orders family: placing orders and reading them back. */
export class OrdersClient extends ScapiClient {
  /** E1-E4: converts a fully-prepared basket into an order — the "Place Order" click. */
  async placeOrder(accessToken: string, basketId: string): Promise<Order> {
    const response = await this.placeOrderRaw(accessToken, basketId);
    expect(response.status(), 'place order').toBe(200);
    return parseJson<Order>(response, orderSchema, 'place order');
  }

  /** E1's rejected-email branch needs the raw verdict, not the happy-path expect. */
  async placeOrderRaw(accessToken: string, basketId: string): Promise<APIResponse> {
    return this.request.post(this.apiUrl(FAMILY, 'orders'), {
      headers: this.json(accessToken),
      params: withLocale(),
      data: { basketId },
    });
  }

  /**
   * B9/H2: the order detail the /account/orders/{no} page loads, with the same OMS
   * expansions the storefront requests.
   */
  async getOrder(accessToken: string, orderNo: string): Promise<Order> {
    const response = await this.request.get(this.apiUrl(FAMILY, `orders/${orderNo}`), {
      headers: this.authed(accessToken),
      params: withLocale({ expand: 'oms,oms_shipments' }),
    });
    expect(response.status(), 'get order').toBe(200);
    return parseJson<Order>(response, orderSchema, 'get order');
  }

  /**
   * H2: the OMS metadata probe. With no Order Management org linked (this demo), SCAPI
   * answers 409 with an oms-not-active fault rather than 200 — the contract-level fact
   * behind the UI's absent tracking/cancel/return affordances.
   */
  async getOmsMetadata(accessToken: string) {
    const response = await this.request.get(this.apiUrl(FAMILY, 'orders/oms-meta-data'), {
      headers: this.authed(accessToken),
      params: withSite(),
    });
    expect(response.status(), 'OMS metadata').toBe(409);
    const body = await parseJson<{ title?: string; detail?: string; message?: string }>(
      response,
      problemDetailSchema,
      'OMS metadata',
    );
    return { status: response.status(), body };
  }
}
