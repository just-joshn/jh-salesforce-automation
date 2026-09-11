import { expect, type APIResponse } from '@playwright/test';
import { env, withLocale } from './env';
import { ScapiClient } from './scapi-client';
import type { Basket } from './scapi-types';
import { parseJson } from './response';
import { basketSchema } from './schemas/baskets';

const V2 = 'checkout/shopper-baskets/v2';
const V1 = 'checkout/shopper-baskets/v1';

export class BasketsClient extends ScapiClient {
  async createBasket(accessToken: string): Promise<Basket> {
    const create = await this.request.post(this.apiUrl(V2, 'baskets'), { headers: this.json(accessToken), params: withLocale(), data: {} });
    expect(create.status(), 'create basket').toBe(200);
    const basket = await parseJson<Basket>(create, basketSchema, 'create basket');
    const patch = await this.request.patch(this.apiUrl(V1, `baskets/${basket.basketId}`), { headers: this.json(accessToken), params: withLocale(), data: { currency: env.E2E_CURRENCY } });
    expect(patch.status(), 'set basket currency').toBe(200);
    return basket;
  }

  async addItem(accessToken: string, basketId: string, productId: string, price: number, quantity = 1, inventoryId?: string): Promise<Basket> {
    const response = await this.request.post(this.apiUrl(V2, `baskets/${basketId}/items`), { headers: this.json(accessToken), params: withLocale(), data: [{ productId, price, quantity, ...(inventoryId ? { inventoryId } : {}), shipmentId: 'me' }] });
    expect(response.status(), 'add basket item').toBe(200);
    return parseJson<Basket>(response, basketSchema, 'add basket item');
  }

  async updateItemQuantity(accessToken: string, basketId: string, itemId: string, quantity: number): Promise<Basket> {
    const response = await this.request.patch(this.apiUrl(V2, `baskets/${basketId}/items/${itemId}`), { headers: this.json(accessToken), params: withLocale(), data: { quantity } });
    expect(response.status(), 'update item quantity').toBe(200);
    return parseJson<Basket>(response, basketSchema, 'update item quantity');
  }

  async removeItem(accessToken: string, basketId: string, itemId: string): Promise<APIResponse> {
    const response = await this.request.delete(this.apiUrl(V2, `baskets/${basketId}/items/${itemId}`), { headers: this.authed(accessToken), params: withLocale() });
    expect(response.status(), 'remove basket item').toBe(200);
    return response;
  }

  async mergeBaskets(accessToken: string): Promise<Basket> {
    const response = await this.request.post(this.apiUrl(V2, 'baskets/actions/merge'), { headers: this.authed(accessToken), params: withLocale({ createDestinationBasket: 'true' }) });
    expect(response.status(), 'merge baskets').toBe(200);
    return parseJson<Basket>(response, basketSchema, 'merge baskets');
  }

  async getBasket(accessToken: string, basketId: string): Promise<Basket> {
    const response = await this.request.get(this.apiUrl(V2, `baskets/${basketId}`), { headers: this.authed(accessToken), params: withLocale() });
    expect(response.status()).toBe(200);
    return parseJson<Basket>(response, basketSchema, 'get basket');
  }

  async clearItems(accessToken: string, basketId: string): Promise<void> {
    const basket = await this.getBasket(accessToken, basketId);
    for (const line of basket.productItems ?? []) if (line.itemId) await this.removeItem(accessToken, basketId, line.itemId);
  }
}
