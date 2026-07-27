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
