import { expect } from '@playwright/test';
import { withLocale } from './env';
import { ScapiClient } from './scapi-client';
import type { Product } from './scapi-types';
import { parseJson } from './response';
import { categorySchema, productSchema } from './schemas';

const PRODUCTS_FAMILY = 'product/shopper-products/v1';

/** Shopper Products (category metadata and product operations). */
export class ProductsClient extends ScapiClient {
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
