import { expect, test as base } from '@playwright/test';

import { env } from '../../config/env';
import { buildPath } from './site';

const consentURL = new URL(buildPath('/'), env.E2E_BASE_URL);

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addCookies([
      {
        name: 'dw_dnt',
        value: '1',
        domain: consentURL.hostname,
        path: '/',
        secure: consentURL.protocol === 'https:',
        sameSite: 'Lax',
      },
    ]);

    await use(context);
  },
});

export { expect };
