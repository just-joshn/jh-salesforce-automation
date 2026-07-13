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

// product search response; hits is absent when nothing matches
export interface ProductSearchResult {
  total: number;
  hits?: ProductSearchHit[];
}

export interface ProductDetail {
  id: string;
  name?: string;
}

export interface CategoryFixture {
  id: string;
  name: string;
}

// a real demo-store category with a name and products
export const validCategory: CategoryFixture = { id: 'newarrivals', name: 'New Arrivals' };

// a nonexistent category id, for the not-found case
export const invalidCategory: { id: string } = { id: 'no-such-cat-xyz' };
