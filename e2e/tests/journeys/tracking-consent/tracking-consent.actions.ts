import type { Locator, Page } from '@playwright/test';
import { buildPath } from '../../../support/site';
import type { ConsentOutcome, ConsentTraffic, TrackingChoice } from './tracking-consent.data';
import {
  isDataCloudEvent,
  isEinsteinActivity,
  isSlasTokenRequest,
  outcomeOf,
  preferenceCookie,
  sessionCookie,
  sessionDnt,
  toDataCloudEvents,
  toEinsteinActivity,
  toSlasTokenRequest,
} from './tracking-consent.data';
import * as Locators from './tracking-consent.locators';

/**
 * Start collecting the consent and analytics traffic the storefront sends for
 * itself. Recording begins before the first navigation so the session's opening
 * DNT declaration is never missed; the returned record grows as the test runs.
 */
export const recordConsentTraffic = (page: Page): ConsentTraffic => {
  const traffic: ConsentTraffic = { tokens: [], einstein: [], dataCloud: [] };
  page.on('request', (request) => {
    if (isSlasTokenRequest(request)) traffic.tokens.push(toSlasTokenRequest(request));
    if (isEinsteinActivity(request)) traffic.einstein.push(toEinsteinActivity(request));
    if (isDataCloudEvent(request)) traffic.dataCloud.push(...toDataCloudEvents(request));
  });
  return traffic;
};

/** Drop what has been recorded so the next step is asserted on its own traffic. */
export const forgetRecordedTraffic = (traffic: ConsentTraffic): void => {
  traffic.tokens.length = 0;
  traffic.einstein.length = 0;
  traffic.dataCloud.length = 0;
};

const cookie = async (page: Page, name: string): Promise<string | undefined> =>
  (await page.context().cookies()).find((entry) => entry.name === name)?.value;

export const storedPreference = async (page: Page): Promise<string | undefined> =>
  cookie(page, preferenceCookie);

export const shopperSessionId = async (page: Page): Promise<string | undefined> =>
  cookie(page, sessionCookie);

/**
 * What the shopper's choice currently amounts to: the preference the storefront
 * has stored, and the DNT the SLAS session it holds was last authorized with.
 *
 * Reading the two together is what makes the choice's arrival observable. The
 * storefront deletes a stored preference that disagrees with the DNT its current
 * access token carries, so the preference is written, deleted and written again
 * around the reauthorization, and only the pair agreeing means the choice is in
 * effect rather than about to be discarded.
 */
export const consentState = async (
  page: Page,
  traffic: ConsentTraffic,
): Promise<Partial<ConsentOutcome>> => ({
  preference: await storedPreference(page),
  sessionDnt: sessionDnt(traffic),
});

export const openStorefront = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/'));
};

export const openProduct = async (page: Page, masterId: string): Promise<void> => {
  await page.goto(buildPath(`/product/${masterId}`));
};

/**
 * Whether the storefront offers a tracking-consent choice at all, which is the
 * half of this journey's condition that only the rendered page can answer.
 */
export const consentPromptAppears = async (page: Page): Promise<boolean> => {
  try {
    await Locators.consentForm(page).waitFor({ state: 'visible', timeout: 30000 });
    return true;
  } catch {
    return false;
  }
};

const choiceButton = (page: Page, choice: TrackingChoice): Locator =>
  choice === 'accept' ? Locators.acceptTracking(page) : Locators.declineTracking(page);

const storedInBrowser = (want: string): boolean => document.cookie.split('; ').includes(want);

/**
 * Whether the choice has landed: the preference is stored and the form has stopped
 * asking. Both halves are needed because the form closing on its own proves
 * nothing — it is rendered into a portal that detaches while the page hydrates,
 * and it reopens whenever the storefront deletes a preference that disagrees with
 * the DNT its access token carries. The preference is read once more afterwards so
 * a value seen only in that gap is not mistaken for a settled one.
 */
const choiceHasLanded = async (page: Page, preference: string): Promise<boolean> => {
  try {
    await page.waitForFunction(storedInBrowser, `${preferenceCookie}=${preference}`, {
      timeout: 10000,
    });
    await Locators.consentForm(page).waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    return false;
  }
  return (await storedPreference(page)) === preference;
};

/**
 * Answer the consent form, pressing again until the choice has landed.
 *
 * The form is served rendered and stays pressable for several seconds before
 * hydration attaches its handler, so an early press is dropped silently and has to
 * be repeated. The press is only offered while the form is actually asking, so a
 * choice that has landed is never answered twice.
 */
export const chooseTracking = async (page: Page, choice: TrackingChoice): Promise<void> => {
  const button = choiceButton(page, choice);
  const { preference } = outcomeOf(choice);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await button.isVisible()) await button.click({ timeout: 10000 }).catch(() => undefined);
    if (await choiceHasLanded(page, preference)) return;
  }
  throw new Error(
    `the tracking-consent form never stored ${preferenceCookie}=${preference} after being answered`,
  );
};
