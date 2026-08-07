import type { APIRequestContext, APIResponse } from '@playwright/test';
import { env } from '../../../config/env';
import { required } from '../../support/scapi';
import type { TokenResponse } from '../../support/scapi-types';
import { getGuestToken } from '../../support/slas';
import type { EinsteinProductView, ReauthorizationForm } from './tracking-consent.data';
import * as Endpoints from './tracking-consent.endpoints';

interface TokenCapture {
  token?: TokenResponse;
}

const capturingPost =
  (request: APIRequestContext, capture: TokenCapture): APIRequestContext['post'] =>
  async (url, options) => {
    const response = await request.post(url, options);
    if (url === Endpoints.token()) capture.token = (await response.json()) as TokenResponse;
    return response;
  };

/**
 * Reuse the shared SLAS guest flow while retaining its complete wire response.
 * `getGuestToken` deliberately exposes only short-lived session fields, but this
 * journey also needs the refresh token to prove same-shopper reauthorization.
 */
const capturingRequest = (request: APIRequestContext, capture: TokenCapture): APIRequestContext =>
  new Proxy(request, {
    get: (target, property): unknown => {
      if (property === 'post') return capturingPost(target, capture);
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

export const obtainRefreshableSession = async (
  request: APIRequestContext,
): Promise<TokenResponse> => {
  const capture: TokenCapture = {};
  await getGuestToken(capturingRequest(request, capture));
  return required(capture.token, 'SLAS token response');
};

export const reauthorizeSession = (
  request: APIRequestContext,
  form: ReauthorizationForm,
): Promise<APIResponse> => request.post(Endpoints.token(), { form });

export const postEinsteinProductView = (
  request: APIRequestContext,
  activity: string,
  view: EinsteinProductView,
): Promise<APIResponse> =>
  request.post(Endpoints.einsteinActivity(activity), {
    headers: {
      'x-cq-client-id': env.einstein.clientId,
      'content-type': 'application/json',
    },
    data: view,
  });
