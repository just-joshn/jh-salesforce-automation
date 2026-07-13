import { test as base } from '@playwright/test';
import { env } from '../../config/env';

// Seed the dw_dnt cookie before the first load so the tracking-consent pop-up never fires.
// The storefront keys that pop-up off the cookie, so presetting it means specs never need a
// dismiss step.
export const test = base.extend({
  context: async ({ context }, use) => {
    const { hostname } = new URL(env.baseURL);
    await context.addCookies([{ name: 'dw_dnt', value: '0', domain: hostname, path: '/' }]);
    await use(context);
  },
});

export { expect } from '@playwright/test';
