export interface DeliveryProductFixture {
  masterId: string;
}

// The White Dress Shirt master; the spec resolves an in-stock variant of it at runtime and
// asserts on that variant's own name/colour/size, since hardcoded variants go stale.
export const deliveryProduct: DeliveryProductFixture = {
  masterId: '78916783M',
};
