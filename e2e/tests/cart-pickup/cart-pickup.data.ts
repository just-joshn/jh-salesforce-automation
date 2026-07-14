export interface PickupProductFixture {
  masterId: string;
  storeCountry: string;
  storePostalCode: string;
  storeName: string;
}

// The White Dress Shirt master; the spec resolves an in-stock variant of it at runtime, since
// hardcoded variants go stale. Searching US / 01801 returns Massachusetts stores; the first
// (closest) is Woburn Retail Store, which the test selects and expects to see on the PDP.
export const pickupProduct: PickupProductFixture = {
  masterId: '78916783M',
  storeCountry: 'United States',
  storePostalCode: '01801',
  storeName: 'Woburn Retail Store',
};
