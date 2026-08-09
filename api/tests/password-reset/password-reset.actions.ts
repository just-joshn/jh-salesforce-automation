import type { APIRequestContext, APIResponse } from '@playwright/test';

import { bearer, withSite } from '../../support/scapi';
import type { CustomerRegistrationRequest, ResetTokenRequest } from './password-reset.data';
import * as Endpoints from './password-reset.endpoints';

const shopperOptions = (accessToken: string) => ({
  headers: bearer(accessToken),
  params: withSite(),
});

export const registerCustomer = async (
  request: APIRequestContext,
  accessToken: string,
  body: CustomerRegistrationRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.customers(), {
    ...shopperOptions(accessToken),
    data: body,
  });

export const requestResetToken = async (
  request: APIRequestContext,
  accountManagerAccessToken: string,
  body: ResetTokenRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.resetToken(), {
    ...shopperOptions(accountManagerAccessToken),
    data: body,
  });
