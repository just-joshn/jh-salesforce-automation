import type { Page, Response } from '@playwright/test';

import { buildPath } from '../../support/site';
import {
  pwaPaths,
  sfraRouteCandidates,
  sfraRouteUrl,
  type PwaJourneyProduct,
  type SfraAvailability,
  type SfraRouteCandidate,
  type ShopperSession,
} from './hybrid-continuity.data';
import * as Locators from './hybrid-continuity.locators';

interface SfraProbeObservation {
  readonly servesSfraPage: boolean;
  readonly status: number;
  readonly url: string;
}

const isSuccessfulStatus = (status: number): boolean => status >= 200 && status < 300;

const raiseForServerFailure = (url: string, status: number): void => {
  if (status >= 500) {
    throw new Error(`SFRA route probe failed for ${url} with HTTP ${status}`);
  }
};

const isSfraPage = async (response: Response, candidate: SfraRouteCandidate, page: Page): Promise<boolean> => {
  if (!isSuccessfulStatus(response.status())) {
    return false;
  }

  return (await page.content()).includes(candidate.expectedHtmlMarker);
};

const probeRoute = async (
  page: Page,
  candidate: SfraRouteCandidate,
): Promise<SfraProbeObservation> => {
  const url = sfraRouteUrl(candidate);
  const response = await page.goto(url);
  if (!response) {
    throw new Error(`SFRA route probe returned no response for ${url}`);
  }

  const status = response.status();
  raiseForServerFailure(url, status);
  return { servesSfraPage: await isSfraPage(response, candidate, page), status, url };
};

const absenceReason = (observations: readonly SfraProbeObservation[]): string =>
  `Journey skipped: no SFRA page served by hybrid probe: ${observations
    .map(({ status, url }) => `${url} returned HTTP ${status}`)
    .join('; ')}.`;

export const probeSfraAvailability = async (page: Page): Promise<SfraAvailability> => {
  const observations: SfraProbeObservation[] = [];
  for (const candidate of sfraRouteCandidates) {
    observations.push(await probeRoute(page, candidate));
  }

  const available = observations.find(({ servesSfraPage }) => servesSfraPage);
  return available
    ? { kind: 'available', url: available.url }
    : { kind: 'absent', reason: absenceReason(observations) };
};

export const buildPwaBasket = async (page: Page, product: PwaJourneyProduct): Promise<void> => {
  await page.goto(buildPath(product.path));
  await Locators.addToCartButton(page).click();
  await Locators.viewCartLink(page).click();
};

export const captureShopperSession = async (page: Page): Promise<ShopperSession> => {
  const cookies = await page.context().cookies();
  return {
    dwsid: cookies.find(({ name }) => name === 'dwsid')?.value ?? null,
    slasAccessToken: await page.evaluate(() => localStorage.getItem('access_token')),
    usid: await page.evaluate(() => localStorage.getItem('usid')),
  };
};

export const visitPwaCart = async (page: Page): Promise<void> => {
  await page.goto(buildPath(pwaPaths.cart));
};

export const visitPwaHome = async (page: Page): Promise<void> => {
  await page.goto(buildPath(pwaPaths.home));
};

export const visitSfraRoute = async (page: Page, url: string): Promise<void> => {
  await page.goto(url);
};
