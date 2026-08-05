export interface ProductSearchHit {
  productId: string;
  productName: string;
  price?: number;
  orderable?: boolean;
}

// Search body; no hits if empty.
export interface ProductSearchResult {
  total: number;
  hits?: ProductSearchHit[];
}

export interface ProductDetail {
  id: string;
  name?: string;
}

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
