import type { ProductSearchHit, ProductSearchResult } from '../../support/scapi-types';

export interface SearchQuery {
  term: string;
}

// Hit list; missing array means empty.
export const hitsOf = (result: ProductSearchResult): ProductSearchHit[] => result.hits ?? [];

// First hit, or fail clear.
export const firstHit = (result: ProductSearchResult): ProductSearchHit => {
  const [hit] = hitsOf(result);
  if (!hit) throw new Error('expected at least one search hit');
  return hit;
};

// Search word that finds products.
export const commonQuery: SearchQuery = { term: 'dress' };

// Search word that finds nothing.
export const noMatchQuery: SearchQuery = { term: 'zzqqxwvnoexist123' };
