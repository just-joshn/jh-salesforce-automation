export interface ProductItem {
  itemId: string;
  productId: string;
  quantity: number;
  // extended price for the line (unit price times quantity)
  price?: number;
}

export interface Basket {
  basketId: string;
  productItems?: ProductItem[];
  productSubTotal?: number;
  orderTotal?: number | null;
}

export interface Fault {
  type?: string;
}

export interface AddItem {
  productId: string;
  quantity: number;
}

export interface CartFixture {
  variantA: string;
  variantB: string;
  updatedQuantity: number;
  overQuantity: number;
}

// two orderable variants of the same shirt, plus a quantity too large to ever be in stock
export const cart: CartFixture = {
  variantA: '78916783M-1',
  variantB: '78916783M-2',
  updatedQuantity: 3,
  overQuantity: 999999,
};

// sum of line prices, for comparing against the basket subtotal
export const lineItemsTotal = (items: ProductItem[]): number =>
  items.reduce((sum, item) => sum + (item.price ?? 0), 0);
