export interface ProductSearchHit {
  productId: string;
  productName: string;
  price?: number;
  orderable?: boolean;
}

// search response; when nothing matches there is no hits array
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

// a common term expected to return results
export const commonQuery: SearchQuery = { term: 'dress' };

// a valid term that matches nothing, for the empty-result case
export const noMatchQuery: SearchQuery = { term: 'zzqqxwvnoexist123' };
