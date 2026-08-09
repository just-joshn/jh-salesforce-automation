// Response shapes only live here; request bodies and expected values belong in each feature's .data.ts.
import type { components as AuthComponents } from '../generated/auth';
import type { components as BasketComponents } from '../generated/shopper-baskets';
import type { components as ConfigurationComponents } from '../generated/shopper-configurations';
import type { components as CustomerComponents } from '../generated/shopper-customers';
import type { components as OrderComponents } from '../generated/shopper-orders';
import type { components as ProductComponents } from '../generated/shopper-products';
import type { components as SearchComponents } from '../generated/shopper-search';
import type { components as StoreComponents } from '../generated/shopper-stores';

export type Basket = BasketComponents['schemas']['Basket'];
export type BasketProductItem = BasketComponents['schemas']['ProductItem'];
export type BasketShipment = BasketComponents['schemas']['Shipment'];
export type ShippingMethodResult = BasketComponents['schemas']['ShippingMethodResult'];
export type Fault = BasketComponents['schemas']['ErrorResponse'];

export type Order = OrderComponents['schemas']['Order'];
export type OrderProductItem = OrderComponents['schemas']['ProductItem'];
export type OrderShipment = OrderComponents['schemas']['Shipment'];
export type OrderPaymentInstrument = OrderComponents['schemas']['OrderPaymentInstrument'];
export type OrderAddress = OrderComponents['schemas']['OrderAddress'];
export type OmsShipment = OrderComponents['schemas']['OmsShipment'];
export type OmsReasonCode = OrderComponents['schemas']['OmsReasonCode'];
export type OmsMetaData = OrderComponents['schemas']['OmsMetaData'];

export type Customer = CustomerComponents['schemas']['Customer'];
export type CustomerOrderResult = CustomerComponents['schemas']['CustomerOrderResult'];
export type CustomerOrder = CustomerComponents['schemas']['Order'];

export type Product = ProductComponents['schemas']['Product'];
export type ProductResult = ProductComponents['schemas']['ProductResult'];
export type ProductVariant = ProductComponents['schemas']['Variant'];
export type ProductInventory = ProductComponents['schemas']['Inventory'];
export type ProductVariationAttribute = ProductComponents['schemas']['VariationAttribute'];
export type Category = ProductComponents['schemas']['Category'];

export type ProductSearchResult = SearchComponents['schemas']['ProductSearchResult'];
export type ProductSearchHit = SearchComponents['schemas']['ProductSearchHit'];

export type Store = StoreComponents['schemas']['Store'];
export type StoreResult = StoreComponents['schemas']['StoreResult'];

export type Configuration = ConfigurationComponents['schemas']['Configuration'];
export type SiteConfiguration = ConfigurationComponents['schemas']['SiteConfiguration'];

export type TokenResponse = AuthComponents['schemas']['TokenResponse'];
