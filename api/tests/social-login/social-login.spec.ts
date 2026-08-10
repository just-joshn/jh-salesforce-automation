import { expect, test } from '@playwright/test';

import { readAppConfiguration } from '../../support/app-config';
import { evaluateSocialLoginGate, formatGateSkipReason } from '../../support/gates';
import { getGuestToken } from '../../support/slas';
import * as Actions from './social-login.actions';
import {
  createSocialAuthorizationRequest,
  expected,
  externalIdpSkipReason,
} from './social-login.data';

// OUT OF SCOPE: Pain rows 2 (external IdP failure) and 3 (callback-state failure) belong to the
// provider and callback channel, which this SCAPI-only suite does not control.

test('CUJ 12 — offers a SLAS authorization entry for every configured identity provider', async ({
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluateSocialLoginGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));

  for (const provider of gate.idps) {
    await test.step('Choose social provider', async () => {
      const token = await getGuestToken(request);
      const response = await Actions.requestSocialAuthorization(
        request,
        createSocialAuthorizationRequest(provider, token.usid),
      );
      expect(response.status()).toBe(expected.authorizationStatus);
      expect(response.headers().location).toBeTruthy();
    });
  }
});

test('CUJ 12 — returns through the callback with an established session and the basket intact', async ({
  request,
}) => {
  const app = await readAppConfiguration(request);
  const gate = evaluateSocialLoginGate(app);
  test.info().annotations.push({
    type: 'layer-scope',
    description:
      'CUJ 12 steps "Authenticate/authorize" and "Return through callback" execute at the external identity provider and on the storefront callback route. Neither is a SCAPI surface, so neither is mirrored here.',
  });
  test.info().annotations.push({
    type: 'coverage-gap',
    description:
      'CUJ 12 steps "Establish SLAS session" and "Merge basket and return" do have SLAS and Shopper Baskets analogues, but both require the authorization code the identity provider issues after a real login. This suite holds no Google or Apple credentials, so the code cannot be obtained and these steps remain unproven at every layer.',
  });

  test.skip(!gate.met, formatGateSkipReason(gate));
  test.skip(true, externalIdpSkipReason(gate.idps, gate.redirectURI));
});
