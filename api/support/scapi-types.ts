// Named SCAPI response shapes from the generated specs, so call sites read
// `Basket` instead of components['schemas']['Basket'].
//
// Response shapes only. Request bodies and expected values stay in each
// feature's *.data.ts, where the Functional Page Model keeps test inputs.
//
// Family-prefixed where two families disagree: a basket line item and an order
// line item are different shapes and are not interchangeable.

import type { components as BasketSchemas } from '../generated/shopper-baskets';
import type { components as CustomerSchemas } from '../generated/shopper-customers';
import type { components as OrderSchemas } from '../generated/shopper-orders';

export type Basket = BasketSchemas['schemas']['Basket'];
export type BasketProductItem = BasketSchemas['schemas']['ProductItem'];
export type BasketShipment = BasketSchemas['schemas']['Shipment'];

export type Order = OrderSchemas['schemas']['Order'];
export type OrderProductItem = OrderSchemas['schemas']['OrderProductItem'];
export type OrderShipment = OrderSchemas['schemas']['Shipment'];
export type OrderPaymentInstrument = OrderSchemas['schemas']['OrderPaymentInstrument'];

// Order history is served by Shopper Customers, which declares its own Order
// schema. Deliberately not the Shopper Orders one above.
export type CustomerOrderResult = CustomerSchemas['schemas']['CustomerOrderResult'];
export type CustomerOrder = CustomerSchemas['schemas']['Order'];

// Same RFC 7807 envelope in every family, so one alias covers all of them.
export type Fault = BasketSchemas['schemas']['ErrorResponse'];
