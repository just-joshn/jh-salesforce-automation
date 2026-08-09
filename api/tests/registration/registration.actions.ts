import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import type {
  CustomerRegistrationRequest,
  InvalidCustomerRegistrationRequest,
} from './registration.data';
import * as Endpoints from './registration.endpoints';

export const registerCustomer = async (
  request: APIRequestContext,
  accessToken: string,
  registration: CustomerRegistrationRequest | InvalidCustomerRegistrationRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.customers(), {
    data: registration,
    headers: bearer(accessToken),
    params: withSite(),
  });
