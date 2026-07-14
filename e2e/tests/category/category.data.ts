export interface CategoryFixture {
  id: string;
  name: string;
}

// A real demo-store category, verified to contain products.
export const validCategory: CategoryFixture = { id: 'newarrivals', name: 'New Arrivals' };

// Pull the product id out of a product page URL:
//   /global/en-US/product/25752235M?color=COBATSI -> 25752235M
export const extractProductId = (href: string | null): string => {
  const match = href?.match(/\/product\/([^/?#]+)/);
  return match?.[1] ?? '';
};
