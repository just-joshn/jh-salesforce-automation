import { z } from 'zod';
import { loose, nullableString } from './primitives';

const basketItemSchema = loose({ itemId: z.string().optional(), productId: z.string().min(1), quantity: z.number(), price: z.number().optional(), shipmentId: z.string().optional() });
export const shipmentSchema = loose({ shipmentId: z.string().optional(), shippingStatus: z.string().optional(), shippingTotal: z.number().nullable().optional(), trackingNumber: nullableString, shippingAddress: z.unknown().optional(), shippingMethod: z.object({ id: z.string().optional() }).passthrough().optional() });
export const paymentInstrumentSchema = loose({ paymentMethodId: z.string().optional(), paymentInstrumentId: z.string().optional() });
export const basketSchema = loose({ basketId: z.string().min(1), currency: z.string().optional(), orderTotal: z.number().nullable().optional(), productItems: z.array(basketItemSchema).optional(), paymentInstruments: z.array(paymentInstrumentSchema).optional(), shipments: z.array(shipmentSchema).optional(), billingAddress: z.unknown().optional() });
const orderItemSchema = loose({ itemId: z.string().optional(), productId: z.string().min(1), quantity: z.number().optional(), shipmentId: z.string().nullable().optional() });
export const shippingMethodsSchema = loose({ applicableShippingMethods: z.array(loose({ id: z.string().min(1), name: z.string(), price: z.number() })) });
export const customerBasketsResponseSchema = loose({ baskets: z.array(basketSchema).optional() });
export const orderSchema = loose({ orderNo: z.string().min(1), orderTotal: z.number().nullable().optional(), customerInfo: z.object({ email: z.string().optional() }).passthrough().optional(), productItems: z.array(orderItemSchema).optional(), shipments: z.array(shipmentSchema).optional(), paymentInstruments: z.array(paymentInstrumentSchema).optional() });
