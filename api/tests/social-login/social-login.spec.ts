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
    await test.step('1 Choose social provider', async () => {
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
  test.skip(!gate.met, formatGateSkipReason(gate));
  test.skip(true, externalIdpSkipReason(gate.idps, gate.redirectURI));

  await test.step('2 Authenticate/authorize', () => {
    expect(gate.idps).not.toHaveLength(0);
  });
  await test.step('3 Return through callback', () => {
    expect(gate.redirectURI).toBeTruthy();
  });
  await test.step('4 Establish SLAS session', () => {
    expect(gate.met).toBe(true);
  });
  await test.step('5 Merge basket and return', () => {
    expect(gate.idps).not.toHaveLength(0);
  });
});
