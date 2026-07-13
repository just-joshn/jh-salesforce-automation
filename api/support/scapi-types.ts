// Response/request shapes only live here; request bodies for a specific call are built
// where that call is made. Sourced from the vendored, officially-generated SCAPI types
// in api/generated/ (see scripts/fetch-api-specs.mjs, scripts/generate-api-types.mjs).
import type { components as AuthComponents } from '../generated/auth';
import type { components as BasketComponents } from '../generated/shopper-baskets';
import type { components as CustomerComponents } from '../generated/shopper-customers';
import type { components as OrderComponents } from '../generated/shopper-orders';
import type { components as ProductComponents } from '../generated/shopper-products';
import type { components as SearchComponents } from '../generated/shopper-search';
import type { components as StoreComponents } from '../generated/shopper-stores';

export type TokenResponse = AuthComponents['schemas']['TokenResponse'];

export type Basket = BasketComponents['schemas']['Basket'];
export type ProductItem = BasketComponents['schemas']['ProductItem'];
export type Shipment = BasketComponents['schemas']['Shipment'];
export type ShippingMethodResult = BasketComponents['schemas']['ShippingMethodResult'];
export type PaymentInstrument = BasketComponents['schemas']['OrderPaymentInstrument'];
export type BasketErrorResponse = BasketComponents['schemas']['ErrorResponse'];

export type Order = OrderComponents['schemas']['Order'];
export type OmsMetaData = OrderComponents['schemas']['OmsMetaData'];

export type Customer = CustomerComponents['schemas']['Customer'];
export type CustomerAddress = CustomerComponents['schemas']['CustomerAddress'];
export type CustomerProductList = CustomerComponents['schemas']['CustomerProductList'];
export type CustomerProductListItem = CustomerComponents['schemas']['CustomerProductListItem'];
export type CustomerProductListResult = CustomerComponents['schemas']['CustomerProductListResult'];
export type CustomerOrderResult = CustomerComponents['schemas']['CustomerOrderResult'];

export type Product = ProductComponents['schemas']['Product'];
export type Category = ProductComponents['schemas']['Category'];

export type ProductSearchResult = SearchComponents['schemas']['ProductSearchResult'];
export type SearchSuggestionResult = SearchComponents['schemas']['SuggestionResult'];

export type Store = StoreComponents['schemas']['Store'];
export type StoreResult = StoreComponents['schemas']['StoreResult'];
