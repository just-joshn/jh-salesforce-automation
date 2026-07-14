import { test as base } from '@playwright/test';
import { env } from '../../config/env';

// Set the dw_dnt cookie before the first page load. The storefront only shows its
// tracking-consent pop-up when that cookie is missing, so with it preset no test ever
// needs a dismiss step.
export const test = base.extend({
  context: async ({ context }, use) => {
    const { hostname } = new URL(env.baseURL);
    await context.addCookies([{ name: 'dw_dnt', value: '0', domain: hostname, path: '/' }]);
    await use(context);
  },
});

export { expect } from '@playwright/test';
