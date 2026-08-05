export interface CategoryFixture {
  id: string;
  name: string;
}

// Real category that has products.
export const validCategory: CategoryFixture = { id: 'newarrivals', name: 'New Arrivals' };

// Product id from URL path.
export const extractProductId = (href: string | null): string => {
  const match = href?.match(/\/product\/([^/?#]+)/);
  return match?.[1] ?? '';
};

// The tile we clicked must land on that product's detail route.
export const productUrl =
  (productId: string) =>
  (url: URL): boolean =>
    url.pathname.includes(`/product/${productId}`);
