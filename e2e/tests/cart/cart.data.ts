export interface CartProductFixture {
  masterId: string;
}

// The White Dress Shirt master; the spec resolves an in-stock variant of it at runtime, since
// hardcoded variants go stale as the shared demo store's stock drains.
export const cartProduct: CartProductFixture = {
  masterId: '78916783M',
};
