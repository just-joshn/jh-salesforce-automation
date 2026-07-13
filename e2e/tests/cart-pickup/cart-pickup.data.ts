export interface PickupProductFixture {
  masterId: string;
  variantId: string;
  name: string;
  storeCountry: string;
  storePostalCode: string;
  storeName: string;
}

// White Dress Shirt. Searching US / 01801 returns Massachusetts stores; the first (closest) is
// Woburn Retail Store, which the test selects and expects to see on the PDP.
export const pickupProduct: PickupProductFixture = {
  masterId: '78916783M',
  variantId: '78916783M-1',
  name: 'The White Dress Shirt',
  storeCountry: 'United States',
  storePostalCode: '01801',
  storeName: 'Woburn Retail Store',
};
