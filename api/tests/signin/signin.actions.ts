import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { RegisteredLogin } from '../../support/slas';
import { loginRegisteredShopper } from '../../support/slas';
import type { RegistrationInput } from './signin.data';
import * as Endpoints from './signin.endpoints';

export const registerCustomer = (
  request: APIRequestContext,
  guestToken: string,
  input: RegistrationInput,
): Promise<APIResponse> =>
  request.post(Endpoints.customers(), {
    params: withSite(),
    headers: bearer(guestToken),
    data: {
      customer: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        login: input.email,
      },
      password: input.password,
    },
  });

// sign in a registered shopper through SLAS (the login API)
export const signIn = (
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<RegisteredLogin> => loginRegisteredShopper(request, email, password);

export const getCustomer = (
  request: APIRequestContext,
  accessToken: string,
  customerId: string,
): Promise<APIResponse> =>
  request.get(Endpoints.customer(customerId), { params: withSite(), headers: bearer(accessToken) });
