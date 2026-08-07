import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import * as Endpoints from './login.endpoints';

const authed = (accessToken: string) => ({
  params: withSite(),
  headers: bearer(accessToken),
});

export const readCustomer = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<APIResponse> => request.get(Endpoints.customer(customerId), authed(accessToken));
