import type { APIRequestContext, Request } from '@playwright/test';
import { dataCloudEventsPath, einsteinActivityPath } from '../../../../api/support/einstein';
import { env } from '../../../../config/env';
import type { DataCloudApiConfig, EinsteinApiConfig } from '../../../support/app-config';
import { readStorefrontAppConfig } from '../../../support/app-config';

/** Which way the shopper answers the tracking-consent form. */
export type TrackingChoice = 'accept' | 'decline';

/**
 * What a choice must produce once it is in effect. Both values are the
 * storefront's own contract rather than a preference of this test: one is what the
 * stored `dw_dnt` preference may hold, the other is what the SLAS token request
 * must declare.
 */
export interface ConsentOutcome {
  preference: string;
  sessionDnt: string;
}

/** Whether the analytics layers this journey propagates DNT into are configured. */
export interface TrackingConsentCondition {
  met: boolean;
  /** Why the journey does or does not exist here, for the skip annotation. */
  reason: string;
}

/** One SLAS token request, which is where the session's DNT is declared. */
export interface SlasTokenRequest {
  grantType?: string;
  dnt?: string;
}

/** One recorded Einstein activity, keyed to a shopper by `cookieId`. */
export interface EinsteinActivity {
  activity: string;
  cookieId?: string;
}

/**
 * One recorded Data Cloud event out of a batched web-events call. Field names
 * mirror the wire payload, where every shopper identifier is replaced with the
 * DNT marker rather than the event being dropped.
 */
export interface DataCloudEvent {
  eventType?: string;
  interactionName?: string;
  id?: string;
  guestId?: string;
  sessionId?: string;
  deviceId?: string;
  customerId?: string;
}

export interface ConsentTraffic {
  tokens: SlasTokenRequest[];
  einstein: EinsteinActivity[];
  dataCloud: DataCloudEvent[];
}

// --- The stored preference, and the session that carries it ---

/** The cookie the shopper's choice is written to. Never suffixed by site. */
export const preferenceCookie = 'dw_dnt';

/** The shopper session id both analytics layers key their events to. */
export const sessionCookie = `usid_${env.scapi.siteId}`;

export const accepted: ConsentOutcome = { preference: '0', sessionDnt: 'false' };

export const declined: ConsentOutcome = { preference: '1', sessionDnt: 'true' };

export const outcomeOf = (choice: TrackingChoice): ConsentOutcome =>
  choice === 'accept' ? accepted : declined;

/** The grant a session is reauthorized with, as opposed to logged in again with. */
export const reauthorizationGrant = 'refresh_token';

// --- What each analytics layer records, and how DNT shows up in it ---

/** Stands in for every shopper identifier once DNT is in effect. */
export const dntMarker = '__DNT__';

/** Einstein: the activity a product page records. */
export const productViewActivity = 'viewProduct';

/** Data Cloud: the same moment, as a catalog interaction. */
export const productViewInteraction = 'catalog-object-view-start';

/** Data Cloud: the two events that exist only to identify the shopper. */
export const identityEvent = 'identity';
export const partyIdentificationEvent = 'partyIdentification';

export const productMasterId = '25591139M';

// --- The condition, proven before the browser starts ---

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

/**
 * The journey only exists where there are analytics layers for the preference to
 * reach, so the condition is read from the app's own shipped configuration before
 * the browser starts. A storefront that will not serve its configuration raises
 * rather than skips, so a broken shop never reads as "this journey does not apply
 * here".
 */
export const trackingConsentCondition = async (
  request: APIRequestContext,
): Promise<TrackingConsentCondition> => {
  const app = await readStorefrontAppConfig(request);
  const reasons = [...einsteinReasons(app.einsteinAPI), ...dataCloudReasons(app.dataCloudAPI)];
  return { met: reasons.length === 0, reason: conditionReason(reasons) };
};

export const consentUxSkipReason =
  'the storefront rendered without ever offering a tracking-consent choice, so the ' +
  'tracking-consent UX is not retained on this deployment';

// --- Reading the storefront's own traffic, to place each step on a service ---

const pathOf = (request: Request): string => new URL(request.url()).pathname;

const formField = (request: Request, field: string): string | undefined =>
  new URLSearchParams(request.postData() ?? '').get(field) ?? undefined;

/**
 * SLAS: the token request that declares the session's DNT. The storefront reaches
 * SLAS through its own proxy, so the path is matched by its tail rather than by a
 * full commerce API host.
 */
export const isSlasTokenRequest = (request: Request): boolean =>
  request.method() === 'POST' && pathOf(request).endsWith('/oauth2/token');

export const toSlasTokenRequest = (request: Request): SlasTokenRequest => ({
  grantType: formField(request, 'grant_type'),
  dnt: formField(request, 'dnt'),
});

export const slasTokenRequestFor =
  (dnt: string) =>
  (request: Request): boolean =>
    isSlasTokenRequest(request) && formField(request, 'dnt') === dnt;

/** The DNT the session currently carries, as last declared to SLAS. */
export const sessionDnt = (traffic: ConsentTraffic): string | undefined =>
  traffic.tokens[traffic.tokens.length - 1]?.dnt;

/** The request that traded the existing session for one carrying the new DNT. */
export const reauthorization = (
  traffic: ConsentTraffic,
  outcome: ConsentOutcome,
): SlasTokenRequest | undefined =>
  traffic.tokens.find(
    (token) => token.grantType === reauthorizationGrant && token.dnt === outcome.sessionDnt,
  );

/** Einstein: an activity the storefront records about what the shopper did. */
export const isEinsteinActivity = (request: Request): boolean =>
  request.method() === 'POST' &&
  pathOf(request).startsWith(einsteinActivityPath('').replace(/\/$/, ''));

export const toEinsteinActivity = (request: Request): EinsteinActivity => {
  const segments = pathOf(request).split('/');
  const body = request.postData() ?? '';
  return {
    activity: segments[segments.length - 1] ?? '',
    cookieId: /"cookieId":"([^"]*)"/.exec(body)?.[1],
  };
};

export const isDataCloudEvent = (request: Request): boolean =>
  request.method() === 'POST' && pathOf(request) === dataCloudEventsPath();

/**
 * Data Cloud batches its events into one base64 form field, so they only become
 * assertable once that field is decoded.
 */
export const toDataCloudEvents = (request: Request): DataCloudEvent[] => {
  const field = (request.postData() ?? '').replace(/^event=/, '');
  try {
    const decoded = Buffer.from(decodeURIComponent(field), 'base64').toString('utf8');
    return (JSON.parse(decoded) as { events?: DataCloudEvent[] }).events ?? [];
  } catch {
    return [];
  }
};

export const productViews = (traffic: ConsentTraffic, masterId: string): DataCloudEvent[] =>
  traffic.dataCloud.filter(
    (event) => event.interactionName === productViewInteraction && event.id === masterId,
  );

export const identifyingEvents = (traffic: ConsentTraffic): DataCloudEvent[] =>
  traffic.dataCloud.filter(
    (event) => event.eventType === identityEvent || event.eventType === partyIdentificationEvent,
  );

export const activities = (traffic: ConsentTraffic, activity: string): EinsteinActivity[] =>
  traffic.einstein.filter((entry) => entry.activity === activity);
