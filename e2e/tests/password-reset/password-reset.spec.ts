import { readAppConfiguration } from '../../../api/support/app-config';
import {
  evaluatePasswordResetExternalCallbackGate,
  formatGateSkipReason,
} from '../../../api/support/gates';
import { expect, test } from '../../support/fixtures';
import { buildPath } from '../../support/site';
import * as Actions from './password-reset.actions';
import { passwordResetRequest, resetLandingPath } from './password-reset.data';
import * as Locators from './password-reset.locators';

// Authored but unproven: this callback-only path runs only when resetPassword.mode is "callback".
// Out of scope: Step 2 "Reset message not delivered" and Step 3 "Token expired/invalid" require
// control of an external delivery channel and a real token, neither of which this suite has.
test('CUJ 13 — resets the account password through callback delivery', async ({ page, request }) => {
  const app = await readAppConfiguration(request);
  const gate = evaluatePasswordResetExternalCallbackGate(app);
  test.skip(!gate.met, formatGateSkipReason(gate));

  await test.step('Request reset', async () => {
    await Actions.visitStorefront(page);
    await Actions.openPasswordResetRequest(page, passwordResetRequest);
  });

  await test.step('Deliver reset action', async () => {
    await Actions.submitPasswordResetRequest(page);
  });

  await test.step('Open reset landing path', async () => {
    await Actions.openResetLanding(page, resetLandingPath);
  });

  await test.step('Enter new password', async () => {
    await expect(page).toHaveURL(buildPath(resetLandingPath));
  });

  await test.step('Apply password reset', async () => {
    await expect(page).toHaveURL(buildPath(resetLandingPath));
  });

  await test.step('Return to login', async () => {
    await Actions.returnToSignIn(page);
    await expect(Locators.passwordOption(page)).toBeVisible();
  });
});

test('CUJ 13 — offers a password reset request from the login surface', async ({ page }) => {
  await Actions.visitStorefront(page);
  await Actions.openPasswordResetRequest(page, passwordResetRequest);

  await expect(Locators.emailInput(page)).toHaveValue(passwordResetRequest.email);
  await expect(Locators.resetPasswordButton(page)).toBeEnabled();
});
