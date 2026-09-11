import { expect } from '@playwright/test';
import { withLocale } from './env';
import { ScapiClient } from './scapi-client';
import { parseJson } from './response';
import { storeSearchResponseSchema } from './schemas/search-products-stores';
import type { PickupStore } from './store-types';

const STORES_FAMILY = 'store/shopper-stores/v1';

/** Shopper Stores (store-search and pickup operations). */
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
}
