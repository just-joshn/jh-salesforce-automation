import type { APIRequestContext, APIResponse } from '@playwright/test';

import type { SocialAuthorizationRequest } from './social-login.data';
import * as Endpoints from './social-login.endpoints';

export const requestSocialAuthorization = async (
  request: APIRequestContext,
  input: SocialAuthorizationRequest,
): Promise<APIResponse> =>
  request.get(Endpoints.authorize(), {
    maxRedirects: 0,
    params: input,
  });
