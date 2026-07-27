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

// Search word that finds products.
export const commonQuery: SearchQuery = { term: 'dress' };

// Search word that finds nothing.
export const noMatchQuery: SearchQuery = { term: 'zzqqxwvnoexist123' };
