export interface SearchQuery {
  term: string;
}

// A common term, verified to return results on the live store.
export const commonQuery: SearchQuery = { term: 'dress' };

// Extract the product id from a PDP URL, e.g. /global/en-US/product/25592581M?color=JJB52A0 -> 25592581M
export const extractProductId = (href: string | null): string => {
  const match = href?.match(/\/product\/([^/?#]+)/);
  return match?.[1] ?? '';
};
