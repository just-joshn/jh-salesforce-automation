import { expect } from '@playwright/test';
import { withLocale } from './env';
import { ScapiClient } from './scapi-client';
import { parseJson } from './response';
import { storeSearchResponseSchema } from './schemas/search-products-stores';
import type { PickupStore } from './store-types';

const STORES_FAMILY = 'store/shopper-stores/v1';

export class StoresClient extends ScapiClient {
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
