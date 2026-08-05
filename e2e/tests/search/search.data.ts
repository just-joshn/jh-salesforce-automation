export interface SearchQuery {
  term: string;
}

// Search word that returns results.
export const commonQuery: SearchQuery = { term: 'dress' };

// Product id from URL path.
export const extractProductId = (href: string | null): string => {
  const match = href?.match(/\/product\/([^/?#]+)/);
  return match?.[1] ?? '';
};

// Submitting the search box lands on /search with the term as the q parameter.
export const searchResultsUrl =
  (term: string) =>
  (url: URL): boolean =>
    url.pathname.endsWith('/search') && url.searchParams.get('q') === term;

// The tile we clicked must land on that product's detail route.
export const productUrl =
  (productId: string) =>
  (url: URL): boolean =>
    url.pathname.includes(`/product/${productId}`);
