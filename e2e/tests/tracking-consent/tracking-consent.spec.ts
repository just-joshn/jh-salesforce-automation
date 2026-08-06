import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import * as Actions from './tracking-consent.actions';
import type { ConsentTraffic, DataCloudEvent, EinsteinActivity } from './tracking-consent.data';
import {
  accepted,
  activities,
  consentUxSkipReason,
  declined,
  dntMarker,
  identifyingEvents,
  productMasterId,
  productViewActivity,
  productViews,
  reauthorization,
  reauthorizationGrant,
  trackingConsentCondition,
} from './tracking-consent.data';
import * as Locators from './tracking-consent.locators';

// This is the one journey the consent form must not arrive pre-answered for. So
// it takes Playwright's own fixtures rather than the shared ones: those set the
// preference cookie up front, precisely so the form never interrupts a test.

const recordedActivity = async (
  traffic: ConsentTraffic,
  activity: string,
): Promise<EinsteinActivity> => {
  await expect
    .poll(() => activities(traffic, activity).length, { timeout: 30000 })
    .toBeGreaterThan(0);
  const [first] = activities(traffic, activity);
  if (first === undefined) throw new Error(`no Einstein ${activity} activity was recorded`);
  return first;
};

const recordedProductView = async (
  traffic: ConsentTraffic,
  masterId: string,
): Promise<DataCloudEvent> => {
  await expect
    .poll(() => productViews(traffic, masterId).length, { timeout: 30000 })
    .toBeGreaterThan(0);
  const [first] = productViews(traffic, masterId);
  if (first === undefined) throw new Error(`no Data Cloud view of ${masterId} was recorded`);
  return first;
};

/**
 * Reach the start of the journey: a shopper on the storefront with no explicit
 * DNT preference, being asked for one.
 *
 * A storefront that renders without ever asking has not retained the
 * tracking-consent UX. That is half of this journey's condition, and the half
 * only the rendered page can answer.
 */
const openConsentPrompt = async (page: Page): Promise<ConsentTraffic> => {
  const traffic = Actions.recordConsentTraffic(page);
  await Actions.openStorefront(page);
  test.skip(!(await Actions.consentPromptAppears(page)), consentUxSkipReason);
  return traffic;
};

// The form's wording is the template's placeholder copy, not a privacy notice.
// So what is asserted is that the choice is offered and explained, not which
// words explain it. Otherwise wording a merchant must replace before launch would
// read as a test failure.
const expectConsentOffered = async (page: Page): Promise<void> => {
  await expect(Locators.consentHeading(page)).toBeVisible();
  await expect(Locators.consentDescription(page)).not.toBeEmpty();
  await expect(Locators.acceptTracking(page)).toBeEnabled();
  await expect(Locators.declineTracking(page)).toBeEnabled();
  await expect(Locators.dismissConsentForm(page)).toBeVisible();
};

// CUJ 24 — Set tracking consent across Commerce and analytics systems, accept
// branch.
//
// The shopper allows behavioural tracking. The preference is written, the SLAS
// session is reauthorized to carry it, and the effective DNT reaches both
// analytics layers. Services: SLAS, Einstein, Data Cloud.
//
// Conditional journey. It only exists where the consent UX is retained and there
// are analytics layers for the preference to reach. Both halves are proven: the
// layers from the app's own shipped configuration before the browser starts, the
// UX from the rendered page.
test('a shopper who accepts tracking is tracked by Einstein and Data Cloud', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);

  const condition = await trackingConsentCondition(request);
  test.skip(!condition.met, condition.reason);

  const traffic = await openConsentPrompt(page);

  // Start of the journey: no explicit DNT preference exists, and the storefront is
  // asking the shopper to make one.
  expect(await Actions.storedPreference(page)).toBeUndefined();
  await expectConsentOffered(page);

  // The shopper accepts. The preference is written, and the SLAS session is
  // reauthorized to carry it. Only once both agree is the choice in effect, rather
  // than a preference the storefront is about to discard.
  await Actions.chooseTracking(page, 'accept');
  await expect(Locators.consentForm(page)).toBeHidden();
  await expect
    .poll(() => Actions.consentState(page, traffic), { timeout: 60000 })
    .toEqual(accepted);

  // The session was traded for one declaring the new DNT rather than logged in
  // again from scratch, which is what makes it the same shopper's session.
  expect(reauthorization(traffic, accepted)).toMatchObject({
    grantType: reauthorizationGrant,
    dnt: accepted.sessionDnt,
  });

  // Everything asserted from here is traffic the storefront sends after the choice
  // was made, so what came before it cannot be mistaken for its effect.
  Actions.forgetRecordedTraffic(traffic);
  await Actions.openProduct(page, productMasterId);
  await expect(Locators.productDetail(page)).toBeVisible({ timeout: 40000 });

  // The stored preference survived the navigation, so the shopper is not asked
  // again.
  expect(await Actions.storedPreference(page)).toBe(accepted.preference);
  await expect(Locators.consentForm(page)).toHaveCount(0);

  // Einstein: the choice reached the personalization layer, which records the
  // product view against this shopper's own session.
  const activity = await recordedActivity(traffic, productViewActivity);
  expect(activity.cookieId).toBe(await Actions.shopperSessionId(page));

  // Success: Data Cloud records the same view carrying the shopper's identifiers
  // rather than the DNT marker, and still sends the events whose only purpose is
  // to identify them.
  const view = await recordedProductView(traffic, productMasterId);
  expect(view.guestId).toBe(await Actions.shopperSessionId(page));
  expect(view.deviceId).not.toBe(dntMarker);
  await expect.poll(() => identifyingEvents(traffic).length, { timeout: 30000 }).toBeGreaterThan(0);
});

// CUJ 24, the decline branch: the same journey answered the other way. The
// preference, the session and both analytics layers must all follow the shopper,
// not just the pop-up closing. Services: SLAS, Einstein, Data Cloud.
test('a shopper who declines tracking is not tracked by Einstein or Data Cloud', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);

  const condition = await trackingConsentCondition(request);
  test.skip(!condition.met, condition.reason);

  const traffic = await openConsentPrompt(page);

  expect(await Actions.storedPreference(page)).toBeUndefined();
  await expectConsentOffered(page);

  // The shopper declines. A session is only reauthorized when it does not already
  // declare the chosen DNT. So what must hold either way is that the stored
  // preference and the session in effect both carry the shopper's choice.
  await Actions.chooseTracking(page, 'decline');
  await expect(Locators.consentForm(page)).toBeHidden();
  await expect
    .poll(() => Actions.consentState(page, traffic), { timeout: 60000 })
    .toEqual(declined);

  Actions.forgetRecordedTraffic(traffic);
  await Actions.openProduct(page, productMasterId);
  await expect(Locators.productDetail(page)).toBeVisible({ timeout: 40000 });

  expect(await Actions.storedPreference(page)).toBe(declined.preference);
  await expect(Locators.consentForm(page)).toHaveCount(0);

  // Data Cloud still records that a product was viewed, but every identifier that
  // would tie the view to this shopper is replaced by the DNT marker.
  const view = await recordedProductView(traffic, productMasterId);
  expect(view.guestId).toBe(dntMarker);
  expect(view.sessionId).toBe(dntMarker);
  expect(view.deviceId).toBe(dntMarker);
  expect(view.customerId).toBe(dntMarker);

  // And the events whose only purpose is to identify the shopper are not sent.
  expect(identifyingEvents(traffic)).toHaveLength(0);

  // Success: Einstein records nothing at all. The Data Cloud view above is what
  // makes that meaningful. It proves the page reached the point where Einstein
  // would have recorded the same moment. So the silence is the preference being
  // honoured, not a page that never got there.
  expect(activities(traffic, productViewActivity)).toHaveLength(0);
  expect(traffic.einstein).toHaveLength(0);
});
