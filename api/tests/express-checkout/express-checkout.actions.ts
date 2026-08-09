import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import { emptyBasketRequest } from './express-checkout.data';
import type {
  BasketCustomerInput,
  BasketItemInput,
  ShipmentAddressInput,
  ShipmentMethodInput,
} from './express-checkout.data';
import * as Endpoints from './express-checkout.endpoints';

const shopperOptions = (accessToken: string) => ({
  headers: bearer(accessToken),
  params: withSite(),
});

export const createBasket = async (
  request: APIRequestContext,
  accessToken: string,
): Promise<APIResponse> =>
  request.post(Endpoints.baskets(), { ...shopperOptions(accessToken), data: emptyBasketRequest });

export const addBasketItem = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketItemInput,
): Promise<APIResponse> =>
  request.post(Endpoints.basketItems(input.basketId), {
    ...shopperOptions(accessToken),
    data: input.body,
  });

export const provideContact = async (
  request: APIRequestContext,
  accessToken: string,
  input: BasketCustomerInput,
): Promise<APIResponse> =>
  request.put(Endpoints.basketCustomer(input.basketId), {
    ...shopperOptions(accessToken),
    data: input.body,
  });

export const provideShippingAddress = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentAddressInput,
): Promise<APIResponse> =>
  request.put(Endpoints.shipmentAddress(input.basketId, input.shipmentId), {
    headers: bearer(accessToken),
    params: withSite({ useAsBilling: 'true' }),
    data: input.body,
  });

export const readShippingMethods = async (
  request: APIRequestContext,
  accessToken: string,
  input: Pick<ShipmentMethodInput, 'basketId' | 'shipmentId'>,
): Promise<APIResponse> =>
  request.get(
    Endpoints.shipmentMethods(input.basketId, input.shipmentId),
    shopperOptions(accessToken),
  );

export const selectShippingMethod = async (
  request: APIRequestContext,
  accessToken: string,
  input: ShipmentMethodInput,
): Promise<APIResponse> =>
  request.put(Endpoints.shipmentMethod(input.basketId, input.shipmentId), {
    ...shopperOptions(accessToken),
    data: input.body,
  });
