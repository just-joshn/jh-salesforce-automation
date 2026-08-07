import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { DataCloudApiConfig, EinsteinApiConfig } from '../../support/app-config';
import { readStorefrontAppConfig } from '../../support/app-config';
import type { TokenResponse } from '../../support/scapi-types';
import { env } from '../../../config/env';

export type TrackingChoice = 'accept' | 'decline';

export interface ConsentOutcome {
  preference: string;
  requestDnt: string;
  sessionDnt: string;
}

export interface TrackingConsentCondition {
  met: boolean;
  reason: string;
}

export interface ReauthorizationForm extends Record<string, string> {
  grant_type: string;
  refresh_token: string;
  client_id: string;
  channel_id: string;
  dnt: string;
}

export interface EinsteinProductView {
  cookieId: string;
  product: { id: string };
}

export const accepted: ConsentOutcome = { preference: '0', requestDnt: 'false', sessionDnt: '0' };

export const declined: ConsentOutcome = { preference: '1', requestDnt: 'true', sessionDnt: '1' };

export const outcomeOf = (choice: TrackingChoice): ConsentOutcome =>
  choice === 'accept' ? accepted : declined;

export const reauthorizationGrant = 'refresh_token';

export const productViewActivity = 'viewProduct';

export const productMasterId = '25591139M';

export const reauthorizationForm = (refreshToken: string, dnt: string): ReauthorizationForm => ({
  grant_type: reauthorizationGrant,
  refresh_token: refreshToken,
  client_id: env.scapi.clientId,
  channel_id: env.scapi.siteId,
  dnt,
});

export const productView = (sessionId: string): EinsteinProductView => ({
  cookieId: sessionId,
  product: { id: productMasterId },
});

export const tokenResponse = async (response: APIResponse): Promise<TokenResponse> =>
  (await response.json()) as TokenResponse;

const einsteinReasons = (einstein: EinsteinApiConfig | undefined): string[] =>
  (einstein?.einsteinId ?? '') === ''
    ? ['app.einsteinAPI.einsteinId is empty, so the Einstein layer is not enabled']
    : [];

const missingSetting = (value: string | undefined, name: string): string[] =>
  (value ?? '') === '' ? [name] : [];

const dataCloudReasons = (dataCloud: DataCloudApiConfig | undefined): string[] => {
  const missing = [
    ...missingSetting(dataCloud?.appSourceId, 'app.dataCloudAPI.appSourceId'),
    ...missingSetting(dataCloud?.tenantId, 'app.dataCloudAPI.tenantId'),
  ];
  return missing.length === 0
    ? []
    : [`${missing.join(' and ')} is empty, so the Data Cloud layer is not enabled`];
};

const conditionReason = (reasons: string[]): string =>
  reasons.length === 0
    ? 'the Einstein and Data Cloud layers are both configured'
    : `the tracking-consent journey is not configured on this storefront: ${reasons.join('; ')}`;

export const trackingConsentCondition = async (
  request: APIRequestContext,
): Promise<TrackingConsentCondition> => {
  const app = await readStorefrontAppConfig(request);
  const reasons = [...einsteinReasons(app.einsteinAPI), ...dataCloudReasons(app.dataCloudAPI)];
  return { met: reasons.length === 0, reason: conditionReason(reasons) };
};
