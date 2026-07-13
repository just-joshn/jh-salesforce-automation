import type { APIRequestContext, APIResponse } from '@playwright/test';
import { bearer, withSite } from '../../support/scapi';
import type { RegistrationInput } from './register.data';
import * as Endpoints from './register.endpoints';

export const registerCustomer = (
  request: APIRequestContext,
  accessToken: string,
  input: RegistrationInput,
): Promise<APIResponse> =>
  request.post(Endpoints.customers(), {
    params: withSite(),
    headers: bearer(accessToken),
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
