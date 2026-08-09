import type { APIRequestContext, APIResponse, Page, Response } from '@playwright/test';

import { bearer, shopperApiUrl, withSite } from '../../../api/support/scapi';
import { getGuestToken } from '../../../api/support/slas';
import { buildPath } from '../../support/site';
import { toCustomerRegistrationRequest, type RegistrationDetails } from './registration.data';
import * as Locators from './registration.locators';

export const visitStorefront = async (page: Page): Promise<void> => {
  await page.goto(buildPath('/'));
};

export const openRegistration = async (page: Page): Promise<void> => {
  await Locators.accountButton(page).click();
  await Locators.createAccountOption(page).click();
};

export const enterAccountDetails = async (
  page: Page,
  details: RegistrationDetails,
): Promise<void> => {
  await Locators.firstNameInput(page).fill(details.firstName);
  await Locators.lastNameInput(page).fill(details.lastName);
  await Locators.emailInput(page).fill(details.email);
  await Locators.passwordInput(page).fill(details.password);
};

export const submitRegistration = async (page: Page): Promise<Response> => {
  const customerResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/customers?'),
  );
  await Locators.createAccountButton(page).click();
  return customerResponse;
};

export const submitInvalidRegistration = async (page: Page): Promise<void> => {
  await Locators.createAccountButton(page).click();
};

export const createCustomerRecord = async (
  request: APIRequestContext,
  details: RegistrationDetails,
): Promise<APIResponse> => {
  const token = await getGuestToken(request);
  return request.post(shopperApiUrl('customer/shopper-customers', 'customers'), {
    data: toCustomerRegistrationRequest(details),
    headers: bearer(token.access_token),
    params: withSite(),
  });
};
