import { expect, test } from '../../support/fixtures';
import * as Actions from './orders.actions';
import { password, uniqueEmail } from './orders.data';
import * as Locators from './orders.locators';

// Order history is gated behind auth; once signed in, a shopper sees only their own order.
test('an authenticated shopper views their order history and detail; a guest is redirected', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const credentials = { email: uniqueEmail(), password };
  const orderNo = await Actions.provisionCustomerWithOrder(request, credentials);

  // Signed-out access to order history should redirect to login.
  await Actions.openOrderHistory(page);
  await expect(page).toHaveURL(/\/login/, { timeout: 20000 });

  await Actions.signIn(page, credentials);
  await Actions.openOrderHistory(page);
  await expect(Locators.orderHistoryPage(page)).toBeVisible({ timeout: 20000 });
  await expect(Locators.orderNumber(page, orderNo).first()).toBeVisible();

  await Actions.openOrderDetail(page);
  await expect(page).toHaveURL(new RegExp(`/account/orders/${orderNo}`), { timeout: 20000 });
  await expect(Locators.orderNumber(page, orderNo).first()).toBeVisible();
});
