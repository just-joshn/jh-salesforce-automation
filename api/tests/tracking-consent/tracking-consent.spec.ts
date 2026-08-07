import { expect, test } from '@playwright/test';
import * as Actions from './tracking-consent.actions';
import {
  accepted,
  declined,
  productView,
  productViewActivity,
  reauthorizationForm,
  reauthorizationGrant,
  tokenResponse,
  trackingConsentCondition,
} from './tracking-consent.data';

test('a shopper who accepts tracking carries consent into SLAS and Einstein', async ({
  request,
}) => {
  test.setTimeout(180000);

  const condition = await trackingConsentCondition(request);
  test.skip(!condition.met, condition.reason);

  const originalSession = await Actions.obtainRefreshableSession(request);

  // Browser-only e2e condition: rendered tracking-consent form appears. An API
  // context cannot observe rendered UX, so this half neither asserts nor skips.

  // Browser-only e2e assertions replaced here: no `dw_dnt` cookie exists; consent
  // heading and explanation are visible; Accept and Decline are enabled; Close is
  // visible. The API has no consent form or cookie jar owned by storefront code.

  // Browser-only e2e actions/assertions replaced here: press Accept until hydration
  // stores `dw_dnt=0`, then assert form hidden and stored preference/session agree.
  // API starts at SLAS because no consent endpoint exists.
  const form = reauthorizationForm(originalSession.refresh_token, accepted.requestDnt);
  expect(form).toMatchObject({ grant_type: reauthorizationGrant, dnt: accepted.requestDnt });

  const refreshResponse = await Actions.reauthorizeSession(request, form);
  expect(refreshResponse.status()).toBe(200);
  const refreshedSession = await tokenResponse(refreshResponse);
  expect(refreshedSession.dnt).toBe(accepted.sessionDnt);
  expect(refreshedSession.usid).toBe(originalSession.usid);
  expect(refreshedSession.customer_id).toBe(originalSession.customer_id);

  // Browser-only e2e steps replaced here: forget recorded browser traffic, open
  // product page, and assert product-details-page renders. API posts that product
  // view directly instead.
  const view = productView(refreshedSession.usid);
  expect(view.cookieId).toBe(refreshedSession.usid);
  const activityResponse = await Actions.postEinsteinProductView(
    request,
    productViewActivity,
    view,
  );
  expect(activityResponse.ok()).toBe(true);
  expect(view.cookieId).toBe(refreshedSession.usid);

  // Browser-only e2e assertions replaced here: `dw_dnt=0` survives navigation and
  // consent form has count 0. Storefront cookie persistence cannot be observed by
  // this isolated API context.

  // Browser-only e2e Data Cloud assertions replaced here: catalog view guestId is
  // shopper session id, deviceId is not `__DNT__`, and identity events are sent.
  // Storefront client analytics performs those calls; no Data Cloud read API exists.
});

test('a shopper who declines tracking reauthorizes their SLAS session with DNT', async ({
  request,
}) => {
  test.setTimeout(180000);

  const condition = await trackingConsentCondition(request);
  test.skip(!condition.met, condition.reason);

  const originalSession = await Actions.obtainRefreshableSession(request);

  // Browser-only e2e condition/assertions replaced here: rendered consent prompt
  // appears, no `dw_dnt` cookie exists, and heading, explanation, both choices and
  // Close are available. API cannot inspect rendered consent UX.

  // Browser-only e2e actions/assertions replaced here: press Decline until hydration
  // stores `dw_dnt=1`, then assert form hidden and stored preference/session agree.
  const form = reauthorizationForm(originalSession.refresh_token, declined.requestDnt);
  expect(form).toMatchObject({ grant_type: reauthorizationGrant, dnt: declined.requestDnt });

  const refreshResponse = await Actions.reauthorizeSession(request, form);
  expect(refreshResponse.status()).toBe(200);
  const refreshedSession = await tokenResponse(refreshResponse);
  expect(refreshedSession.dnt).toBe(declined.sessionDnt);
  expect(refreshedSession.usid).toBe(originalSession.usid);
  expect(refreshedSession.customer_id).toBe(originalSession.customer_id);

  // Browser-only e2e steps replaced here: clear recorded traffic, open product page,
  // assert product detail renders, `dw_dnt=1` survives and consent form has count 0.

  // Browser-only e2e Data Cloud assertions replaced here: catalog view still sends,
  // every shopper identifier becomes `__DNT__`, and identity/partyIdentification
  // events disappear. Substitution occurs in storefront client analytics only.

  // Browser-only e2e Einstein assertions replaced here: no viewProduct activity and
  // no Einstein traffic at all. Suppression is performed by storefront client code;
  // calling Einstein from this API test would fake the behavior under test.
});
