import { expect, test } from '../../support/fixtures';
import * as Actions from './orders.actions';
import {
  loginUrlPattern,
  newCredentials,
  orderDetailUrlPattern,
  provisionCustomerWithOrder,
} from './orders.data';
import * as Locators from './orders.locators';

// Signed-in shopper sees only their orders.
test('an authenticated shopper views their order history and detail; a guest is redirected', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const credentials = newCredentials();
  const orderNo = await provisionCustomerWithOrder(request, credentials);

  // Guest on order history → login page.
  await Actions.openOrderHistory(page);
  await expect(page).toHaveURL(loginUrlPattern, { timeout: 20000 });

  await Actions.signIn(page, credentials);
  await Actions.openOrderHistory(page);
  await expect(Locators.orderHistoryPage(page)).toBeVisible({ timeout: 20000 });
  await expect(Locators.orderNumber(page, orderNo).first()).toBeVisible();

  await Actions.openOrderDetail(page);
  await expect(page).toHaveURL(orderDetailUrlPattern(orderNo), { timeout: 20000 });
  await expect(Locators.orderNumber(page, orderNo).first()).toBeVisible();
});
