// Named SCAPI response shapes from the generated specs, so call sites read
// `Basket` instead of components['schemas']['Basket'].
//
// Response shapes only. Request bodies and expected values stay in each
// feature's *.data.ts, where the Functional Page Model keeps test inputs.
//
// Family-prefixed where two families disagree: a basket line item and an order
// line item are different shapes and are not interchangeable.

import type { components as AuthSchemas } from '../generated/auth';
import type { components as BasketSchemas } from '../generated/shopper-baskets';
import type { components as ConfigurationSchemas } from '../generated/shopper-configurations';
import type { components as CustomerSchemas } from '../generated/shopper-customers';
import type { components as OrderSchemas } from '../generated/shopper-orders';
import type { components as ProductSchemas } from '../generated/shopper-products';
import type { components as SearchSchemas } from '../generated/shopper-search';
import type { components as StoreSchemas } from '../generated/shopper-stores';

export type Basket = BasketSchemas['schemas']['Basket'];
export type BasketProductItem = BasketSchemas['schemas']['ProductItem'];
export type BasketShipment = BasketSchemas['schemas']['Shipment'];

export type Order = OrderSchemas['schemas']['Order'];
export type OrderProductItem = OrderSchemas['schemas']['OrderProductItem'];
export type OrderShipment = OrderSchemas['schemas']['Shipment'];
export type OrderPaymentInstrument = OrderSchemas['schemas']['OrderPaymentInstrument'];
export type OrderAddress = OrderSchemas['schemas']['OrderAddress'];

// Order history is served by Shopper Customers, which declares its own Order
// schema. Deliberately not the Shopper Orders one above.
export type CustomerOrderResult = CustomerSchemas['schemas']['CustomerOrderResult'];
export type CustomerOrder = CustomerSchemas['schemas']['Order'];

// Order Management state, reached through Shopper Orders' `oms` and
// `oms_shipments` expansions rather than a separate API. Order['omsData'] and
// OrderProductItem['omsData'] reach the rest.
export type OmsShipment = OrderSchemas['schemas']['OmsShipment'];
export type OmsReasonCode = OrderSchemas['schemas']['OmsReasonCode'];
export type OmsMetaData = OrderSchemas['schemas']['OmsMetaData'];

export type Product = ProductSchemas['schemas']['Product'];
export type ProductResult = ProductSchemas['schemas']['ProductResult'];
export type ProductVariant = ProductSchemas['schemas']['Variant'];
export type ProductInventory = ProductSchemas['schemas']['Inventory'];
export type ProductVariationAttribute = ProductSchemas['schemas']['VariationAttribute'];
export type Category = ProductSchemas['schemas']['Category'];

export type ProductSearchResult = SearchSchemas['schemas']['ProductSearchResult'];
export type ProductSearchHit = SearchSchemas['schemas']['ProductSearchHit'];

export type Store = StoreSchemas['schemas']['Store'];
export type StoreResult = StoreSchemas['schemas']['StoreResult'];

// The spec leaves `inventoryId` optional, but a store cannot be asked whether it
// stocks something without one. Pickup flows narrow to this.
export type StockKeepingStore = Store & { inventoryId: string };

export type Customer = CustomerSchemas['schemas']['Customer'];

export type TokenResponse = AuthSchemas['schemas']['TokenResponse'];

export type Configuration = ConfigurationSchemas['schemas']['Configuration'];
export type SiteConfiguration = ConfigurationSchemas['schemas']['SiteConfiguration'];

// Same RFC 7807 envelope in every family, so one alias covers all of them.
export type Fault = BasketSchemas['schemas']['ErrorResponse'];
