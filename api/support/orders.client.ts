import { expect, type APIResponse } from '@playwright/test';
import { withLocale, withSite } from './env';
import { ScapiClient } from './scapi-client';
import type { Order } from './scapi-types';
import { parseJson } from './response';
import { orderSchema } from './schemas';

const FAMILY = 'checkout/shopper-orders/v1';

export class OrdersClient extends ScapiClient {
  async placeOrder(accessToken: string, basketId: string): Promise<Order> {
    const response = await this.placeOrderRaw(accessToken, basketId);
    expect(response.status(), 'place order').toBe(200);
    return parseJson<Order>(response, orderSchema, 'place order');
  }

  async placeOrderRaw(accessToken: string, basketId: string): Promise<APIResponse> {
    return this.request.post(this.apiUrl(FAMILY, 'orders'), {
      headers: this.json(accessToken),
      params: withLocale(),
      data: { basketId },
    });
  }

  async getOrder(accessToken: string, orderNo: string): Promise<Order> {
    const response = await this.request.get(this.apiUrl(FAMILY, `orders/${orderNo}`), {
      headers: this.authed(accessToken),
      params: withLocale({ expand: 'oms,oms_shipments' }),
    });
    expect(response.status(), 'get order').toBe(200);
    return parseJson<Order>(response, orderSchema, 'get order');
  }

  async getOmsMetadata(accessToken: string) {
    const response = await this.request.get(this.apiUrl(FAMILY, 'orders/oms-meta-data'), {
      headers: this.authed(accessToken),
      params: withSite(),
    });
    const status = response.status();
    let body: { title?: string; detail?: string; message?: string } = {};
    if (status === 200 || status === 409) {
      const payload: unknown = await response.json().catch(() => ({}));
      if (payload && typeof payload === 'object') {
        body = payload;
      }
    }
    return { status, body };
  }
}
