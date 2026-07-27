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
