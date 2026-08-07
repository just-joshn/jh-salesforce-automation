import { shopperApiUrl, withSite } from '../../support/scapi';

const BASKETS = 'checkout/shopper-baskets/v2';
const PRODUCTS = 'product/shopper-products/v1';
const SEARCH = 'search/shopper-search/v1';

const productSearchUrl = (params: Record<string, string>, refinements: string[]): string => {
  const url = new URL(shopperApiUrl(SEARCH, 'product-search'));
  for (const [key, value] of Object.entries(withSite(params))) url.searchParams.set(key, value);
  for (const refinement of refinements) url.searchParams.append('refine', refinement);
  return url.toString();
};

export const baskets = (): string => shopperApiUrl(BASKETS, 'baskets');

export const basket = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}`);

export const basketItems = (basketId: string): string =>
  shopperApiUrl(BASKETS, `baskets/${encodeURIComponent(basketId)}/items`);

export const advertisedPromotions = (term: string): string =>
  productSearchUrl({ q: term, limit: '24', expand: 'promotions' }, []);

export const qualifyingProducts = (promotionId: string): string =>
  productSearchUrl({ limit: '24' }, [`pmid=${promotionId}`, 'pmpt=qualifying']);

// Shopper Search's product-search resource resolves the bonus side of a promotion.
export const eligibleBonusProducts = (promotionId: string): string =>
  productSearchUrl({ limit: '24', expand: 'prices,promotions' }, [
    `pmid=${promotionId}`,
    'pmpt=bonus',
  ]);

export const product = (productId: string): string =>
  shopperApiUrl(PRODUCTS, `products/${encodeURIComponent(productId)}`);
