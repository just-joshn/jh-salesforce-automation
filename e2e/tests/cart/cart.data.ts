export interface CartProductFixture {
  masterId: string;
}

// The White Dress Shirt master product. The spec picks an in-stock variant of it at runtime,
// because hardcoded variants go stale as the demo store's stock sells out.
export const cartProduct: CartProductFixture = {
  masterId: '78916783M',
};
