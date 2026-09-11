import { expect } from '@playwright/test';
import { withSite } from './env';
import { ScapiClient } from './scapi-client';
import type { Basket } from './scapi-types';
import { parseJson } from './response';
import { customerBasketsResponseSchema } from './schemas/baskets';



export class CustomerBasketsClient extends ScapiClient {
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

}
