export interface CartProductFixture {
  masterId: string;
  variantId: string;
  name: string;
}

// White Dress Shirt. First color (White) + first size (15L) resolve to variant 78916783M-1, the row
// the test asserts on.
export const cartProduct: CartProductFixture = {
  masterId: '78916783M',
  variantId: '78916783M-1',
  name: 'The White Dress Shirt',
};
