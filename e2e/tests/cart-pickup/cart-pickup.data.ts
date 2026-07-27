export interface PickupProductFixture {
  masterId: string;
  storeCountry: string;
  storePostalCode: string;
  storeName: string;
}

// Main product id. Store search US/01801 → Woburn Retail Store.
export const pickupProduct: PickupProductFixture = {
  masterId: '25591139M',
  storeCountry: 'United States',
  storePostalCode: '01801',
  storeName: 'Woburn Retail Store',
};
