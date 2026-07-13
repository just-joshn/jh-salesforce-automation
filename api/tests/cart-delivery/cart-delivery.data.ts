export interface Variant {
  productId: string;
  orderable: boolean;
  price?: number;
  variationValues?: Record<string, string>;
}

export interface Product {
  id: string;
  variants?: Variant[];
}

export interface ProductItem {
  itemId: string;
  productId: string;
  quantity: number;
  price?: number;
  shipmentId?: string;
}

export interface Basket {
  basketId: string;
  productItems?: ProductItem[];
  shipments?: { shipmentId: string }[];
}

export interface Fault {
  type?: string;
  title?: string;
}

export interface DeliveryFixture {
  masterId: string;
  quantity: number;
  overQuantity: number;
}

// master product with color/size variants, known to be shippable
export const deliveryProduct: DeliveryFixture = {
  masterId: '78916783M',
  quantity: 2,
  overQuantity: 999999,
};
