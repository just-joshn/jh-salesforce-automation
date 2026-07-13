export interface DeliveryProductFixture {
  masterId: string;
  variantId: string;
  name: string;
  color: string;
  size: string;
}

// White Dress Shirt. Choosing the first color/size (White, 15L) yields variant 78916783M-1, the row
// the test looks for.
export const deliveryProduct: DeliveryProductFixture = {
  masterId: '78916783M',
  variantId: '78916783M-1',
  name: 'The White Dress Shirt',
  color: 'White',
  size: '15L',
};
