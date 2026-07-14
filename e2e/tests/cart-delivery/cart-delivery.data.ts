export interface DeliveryProductFixture {
  masterId: string;
}

// The White Dress Shirt master product. The spec picks an in-stock variant of it at runtime
// and asserts on that variant's own name, color, and size; hardcoded variants go stale.
export const deliveryProduct: DeliveryProductFixture = {
  masterId: '78916783M',
};
