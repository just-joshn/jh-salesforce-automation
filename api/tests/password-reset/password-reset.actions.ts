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
  accountManagerCredentials: string,
  body: ResetTokenRequest,
): Promise<APIResponse> =>
  request.post(Endpoints.resetToken(), {
    data: body,
    headers: { Authorization: `Basic ${accountManagerCredentials}` },
    params: withSite(),
  });

export const requestCallbackReset = async (
  request: APIRequestContext,
  form: Readonly<Record<string, string>>,
): Promise<APIResponse> => request.post(Endpoints.passwordReset(), { form });

export const applyPasswordAction = async (
  request: APIRequestContext,
  form: Readonly<Record<string, string>>,
): Promise<APIResponse> => request.post(Endpoints.passwordAction(), { form });
