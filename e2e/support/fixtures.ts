import { test as base } from '@playwright/test';
import { env } from '../../config/env';

// Set cookie so the tracking pop-up never shows.
export const test = base.extend({
  context: async ({ context }, use) => {
    const { hostname } = new URL(env.baseURL);
    await context.addCookies([{ name: 'dw_dnt', value: '0', domain: hostname, path: '/' }]);
    await use(context);
  },
});

export { expect } from '@playwright/test';
