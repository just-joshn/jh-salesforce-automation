import { expect, type APIRequestContext } from '@playwright/test';
import type { StorefrontAppConfig } from '../../support/storefront-config';
import { storefrontRequestUrl } from './env';
import { appConfigSchema, mobifyDataSchema } from './schemas';

export type { StorefrontAppConfig };

export async function readAppConfig(request: APIRequestContext): Promise<StorefrontAppConfig> {
  const response = await request.get(storefrontRequestUrl());
  expect(response.status(), 'storefront config document').toBe(200);
  const html = await response.text();

  const match = /<script\b[^>]*\bid=(['"])mobify-data\1[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match?.[2]) {
    throw new Error('Storefront response contains no <script id="mobify-data"> element');
  }

  const parsed = mobifyDataSchema.parse(JSON.parse(match[2]));
  return appConfigSchema.parse(parsed.__CONFIG__.app);
}
