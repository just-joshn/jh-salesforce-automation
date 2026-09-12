import { expect } from '@playwright/test';
import { withLocale } from './env';
import { ScapiClient } from './scapi-client';
import type { Product } from './scapi-types';
import { parseJson } from './response';
import { categorySchema, productSchema } from './schemas';

const PRODUCTS_FAMILY = 'product/shopper-products/v1';

export class ProductsClient extends ScapiClient {
  async getCategory(accessToken: string, categoryId: string) {
    const response = await this.request.get(
      this.apiUrl(PRODUCTS_FAMILY, `categories/${categoryId}`),
      { headers: this.authed(accessToken), params: withLocale() },
    );
    expect(response.status(), 'get category').toBe(200);
    return parseJson<{ id: string; name: string }>(response, categorySchema, 'get category');
  }

  async firstOrderableVariant(accessToken: string, productId: string): Promise<Product> {
    const response = await this.request.get(this.apiUrl(PRODUCTS_FAMILY, `products/${productId}`), {
      headers: this.authed(accessToken),
      params: withLocale({ expand: 'variations,availability' }),
    });
    expect(response.status(), 'get product').toBe(200);
    return parseJson<Product>(response, productSchema, 'get product');
  }
}
