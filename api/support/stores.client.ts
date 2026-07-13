import { expect } from '@playwright/test';
import { withLocale } from './env';
import { ScapiClient } from './scapi-client';
import type { Product } from './scapi-types';
import { parseJson } from './response';
import { categorySchema, productSchema, storeSearchResponseSchema } from './schemas';
import type { PickupStore } from './store-types';

const STORES_FAMILY = 'store/shopper-stores/v1';
const PRODUCTS_FAMILY = 'product/shopper-products/v1';

/** Shopper Stores (store-search) and Shopper Products (category metadata). */
export class StoresClient extends ScapiClient {
  /**
   * F1: the postal-code store search the locator UI issues — countryCode, km units, a
   * 100 km radius, limit 200 — returning stores distance-sorted by the API itself.
   */
  async searchByPostalCode(accessToken: string, postalCode: string): Promise<PickupStore[]> {
    const response = await this.request.get(this.apiUrl(STORES_FAMILY, 'store-search'), {
      headers: this.authed(accessToken),
      params: withLocale({
        postalCode,
        countryCode: 'US',
        distanceUnit: 'km',
        maxDistance: '100',
        limit: '200',
      }),
    });
    expect(response.status(), 'store search').toBe(200);
    return this.parseStores(response);
  }

  /**
   * F2: the lat/long variant of the same search — the exact request "Use My Location"
   * issues once the browser grants geolocation. The permission branch itself is
   * browser-only; this call is its API footprint.
   */
  async searchByCoordinates(
    accessToken: string,
    latitude: string,
    longitude: string,
  ): Promise<PickupStore[]> {
    const response = await this.request.get(this.apiUrl(STORES_FAMILY, 'store-search'), {
      headers: this.authed(accessToken),
      params: withLocale({
        latitude,
        longitude,
        distanceUnit: 'km',
        maxDistance: '100',
        limit: '200',
      }),
    });
    expect(response.status(), 'store search by coordinates').toBe(200);
    return this.parseStores(response);
  }

  private async parseStores(response: Awaited<ReturnType<typeof this.request.get>>) {
    const body = await parseJson<{ data: PickupStore[] }>(
      response,
      storeSearchResponseSchema,
      'store search',
    );
    return body.data;
  }

  /** G2: the category metadata the gift-certificates landing page loads. */
  async getCategory(accessToken: string, categoryId: string) {
    const response = await this.request.get(
      this.apiUrl(PRODUCTS_FAMILY, `categories/${categoryId}`),
      { headers: this.authed(accessToken), params: withLocale() },
    );
    expect(response.status(), 'get category').toBe(200);
    return parseJson<{ id: string; name: string }>(response, categorySchema, 'get category');
  }

  /** Resolves a master product's concrete orderable variant (SCAPI rejects masters in baskets). */
  async firstOrderableVariant(accessToken: string, productId: string): Promise<Product> {
    const response = await this.request.get(this.apiUrl(PRODUCTS_FAMILY, `products/${productId}`), {
      headers: this.authed(accessToken),
      params: withLocale({ expand: 'variations,availability' }),
    });
    expect(response.status(), 'get product').toBe(200);
    return parseJson<Product>(response, productSchema, 'get product');
  }
}
