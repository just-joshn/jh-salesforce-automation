import type { Page, Request } from '@playwright/test';

import {
  commerceClientBundleUrlPattern,
  commerceSessionStorageKey,
  miawBundleUrlPattern,
  providerBundleUrlPatterns,
  tokenBridgePath,
} from './shopping-agent.data';
import type { ProviderBundleExpectation } from './shopping-agent.data';
import * as Locators from './shopping-agent.locators';

export interface ProviderBundleObservation {
  readonly commerceClientUrls: readonly string[];
  readonly matchedUrls: readonly string[];
  readonly miawUrls: readonly string[];
}

export interface TokenBridgeObservation {
  readonly requests: readonly Request[];
}

export const visitStorefront = async (page: Page, destination: string): Promise<void> => {
  await page.goto(destination);
};

export const observeProviderBundles = (
  page: Page,
  expectedProvider: ProviderBundleExpectation,
): ProviderBundleObservation => {
  const matchedUrls: string[] = [];
  const miawUrls: string[] = [];
  const commerceClientUrls: string[] = [];

  page.on('request', (request) => {
    const url = request.url();
    if (miawBundleUrlPattern.test(url)) {
      miawUrls.push(url);
    }
    if (commerceClientBundleUrlPattern.test(url)) {
      commerceClientUrls.push(url);
    }
    if (providerBundleUrlPatterns.some((pattern) => pattern.test(url))) {
      matchedUrls.push(url);
      return;
    }
    if (expectedProvider.bundleUrlPattern.test(url)) {
      matchedUrls.push(url);
    }
  });

  return { commerceClientUrls, matchedUrls, miawUrls };
};

export const providerBundleWasRequested = (
  observation: ProviderBundleObservation,
  provider: ProviderBundleExpectation,
): boolean => observation.matchedUrls.some((url) => provider.bundleUrlPattern.test(url));

export const hasProviderGlobal = async (
  page: Page,
  provider: ProviderBundleExpectation,
): Promise<boolean> => page.evaluate((globalName) => globalName in window, provider.globalName);

export const hasCommerceSession = async (page: Page): Promise<boolean> => {
  const storageState = await page.context().storageState();
  return storageState.origins.some(({ localStorage }) =>
    localStorage.some(({ name, value }) => name === commerceSessionStorageKey && value.length > 0),
  );
};

export const observeIdentityBridge = (page: Page): TokenBridgeObservation => {
  const requests: Request[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.method() === 'POST' && url.pathname === tokenBridgePath) {
      requests.push(request);
    }
  });
  return { requests };
};

export const openAgent = async (page: Page): Promise<void> => {
  await Locators.agentEntry(page).click();
};

export const askCommerceQuestion = async (page: Page, question: string): Promise<void> => {
  await Locators.conversationInput(page).fill(question);
  await Locators.sendConversationMessageButton(page).click();
};

export const continueShoppingInCart = async (page: Page): Promise<void> => {
  await Locators.cartButton(page).click();
};

export const searchForSuggestions = async (page: Page, searchTerm: string): Promise<void> => {
  await Locators.searchBox(page).fill(searchTerm);
};
