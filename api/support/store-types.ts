/** Store data shared by store lookup and pickup checkout workflows. */
export interface PickupStore {
  id: string;
  name: string;
  phone: string;
  address1: string;
  city: string;
  stateCode: string;
  postalCode: string;
  /** km from the search origin, as returned by store-search. */
  distance?: number;
}
