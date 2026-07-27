export interface CategoryDetail {
  id: string;
  name?: string;
}

export interface ProductSearchHit {
  productId: string;
  productName: string;
  price?: number;
  orderable?: boolean;
}

// Search body; no hits array if empty.
export interface ProductSearchResult {
  total: number;
  hits?: ProductSearchHit[];
}

export interface ProductDetail {
  id: string;
  name?: string;
}

// Hit list; missing array means empty.
export const hitsOf = (result: ProductSearchResult): ProductSearchHit[] => result.hits ?? [];

export interface CategoryFixture {
  id: string;
  name: string;
}

// Real category with products.
export const validCategory: CategoryFixture = { id: 'newarrivals', name: 'New Arrivals' };

// Fake category id (should 404).
export const invalidCategory: { id: string } = { id: 'no-such-cat-xyz' };
