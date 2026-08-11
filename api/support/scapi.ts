import type { APIResponse } from '@playwright/test';

import { env } from '../../config/env';

export const scapiHost = (): string =>
  `https://${env.SFCC_SHORT_CODE}.api.commercecloud.salesforce.com`;

const organizationPath = (resourcePath: string): string =>
  `/organizations/${env.SFCC_ORG_ID}/${resourcePath.replace(/^\/+/, '')}`;

export const shopperApiUrl = (apiFamily: string, resourcePath: string): string =>
  `${scapiHost()}/${apiFamily}/v1${organizationPath(resourcePath)}`;

export const slasUrl = (resourcePath: string): string =>
  `${scapiHost()}/shopper/auth/v1${organizationPath(resourcePath)}`;

export const withSite = (params: Record<string, string> = {}): Record<string, string> => ({
  ...params,
  siteId: env.SFCC_SITE_ID,
});

export const bearer = (accessToken: string): Record<string, string> => ({
  Authorization: `Bearer ${accessToken}`,
});

export const required = <T>(value: T | undefined, field: string): T => {
  if (value === undefined) {
    throw new Error(`Missing required SCAPI field: ${field}`);
  }

  return value;
};

export const requireStatus = async (
  response: APIResponse,
  status: number,
  operation: string,
): Promise<void> => {
  if (response.status() !== status) {
    throw new Error(`${operation} failed with HTTP ${response.status()}: ${await response.text()}`);
  }
};

export const requireOk = async (response: APIResponse, operation: string): Promise<void> => {
  if (!response.ok()) {
    throw new Error(`${operation} failed with HTTP ${response.status()}: ${await response.text()}`);
  }
};
