import type { Page } from '@playwright/test';

import { expect, test } from '../../support/fixtures';
import * as Actions from './registration.actions';
import {
  createRegistrationDetails,
  toInvalidRegistrationDetails,
  type RegistrationDetails,
} from './registration.data';
import * as Locators from './registration.locators';

const completeRegistrationJourney = async (
  page: Page,
  details: RegistrationDetails,
): Promise<void> => {
  await test.step('Open registration', async () => {
    await Actions.visitStorefront(page);
    await Actions.openRegistration(page);
    await expect(Locators.registrationDialog(page)).toBeVisible();
  });

  await test.step('Enter required account details', async () => {
    await Actions.enterAccountDetails(page, details);
    await expect(Locators.firstNameInput(page)).toHaveValue(details.firstName);
    await expect(Locators.lastNameInput(page)).toHaveValue(details.lastName);
    await expect(Locators.emailInput(page)).toHaveValue(details.email);
    await expect(Locators.passwordInput(page)).toHaveValue(details.password);
  });

  await test.step('Create customer record', async () => {
    const customerResponse = await Actions.submitRegistration(page);
    await expect.poll(() => customerResponse.status()).toBe(200);
  });

  await test.step('Authenticate new account', async () => {
    await expect(Locators.authenticatedAccountMenu(page)).toBeVisible();
  });

  await test.step('Reach registered account state', async () => {
    await expect(Locators.accountHeading(page)).toBeVisible();
  });
};

test('CUJ 9 — registers a new customer and reaches an authenticated account state', async ({
  page,
}) => {
  await completeRegistrationJourney(page, createRegistrationDetails());
});

test('CUJ 9 — reports a field-level error when required account details are invalid', async ({
  page,
}) => {
  const details = toInvalidRegistrationDetails(createRegistrationDetails());

  await test.step('Open registration', async () => {
    await Actions.visitStorefront(page);
    await Actions.openRegistration(page);
    await expect(Locators.registrationDialog(page)).toBeVisible();
  });

  await test.step('Enter required account details', async () => {
    await Actions.enterAccountDetails(page, details);
    await Actions.submitInvalidRegistration(page);
    await expect(Locators.firstNameError(page)).toBeVisible();
    await expect(Locators.lastNameError(page)).toBeVisible();
    await expect(Locators.passwordError(page)).toBeVisible();
    await expect(Locators.authenticatedAccountMenu(page)).not.toBeVisible();
  });
});

test('CUJ 9 — rejects registration when the email already belongs to an account', async ({
  page,
  request,
}) => {
  const details = createRegistrationDetails();
  const createdCustomer = await Actions.createCustomerRecord(request, details);
  await expect.poll(() => createdCustomer.status()).toBe(200);

  await test.step('Open registration', async () => {
    await Actions.visitStorefront(page);
    await Actions.openRegistration(page);
    await expect(Locators.registrationDialog(page)).toBeVisible();
  });

  await test.step('Enter required account details', async () => {
    await Actions.enterAccountDetails(page, details);
    await expect(Locators.emailInput(page)).toHaveValue(details.email);
  });

  await test.step('Create customer record', async () => {
    const customerResponse = await Actions.submitRegistration(page);
    await expect.poll(() => customerResponse.status()).toBe(400);
    await expect(Locators.registrationError(page)).toBeVisible();
  });

  await test.step('Authenticate new account', async () => {
    await expect(Locators.authenticatedAccountMenu(page)).not.toBeVisible();
  });

  await test.step('Reach registered account state', async () => {
    await expect(Locators.accountHeading(page)).not.toBeVisible();
  });
});
