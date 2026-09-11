import { expect, test } from '../support/fixtures';
import { placeSignedInOrder } from '../support/workflows';

test.describe('H. Hybrid Continuity & Order Management (config-off complements)', {
  tag: ['@hybrid-continuity', '@config-off'],
}, () => {
  test('H2 - Shipment tracking, cancellation, and returns have nothing to act on (OMS not connected)', {
    tag: ['@destructive', '@nightly'],
  }, async ({ signedInPage: page, orderHistoryPage }) => {
    const order = await placeSignedInOrder(page);

    const detailResponse = await orderHistoryPage.gotoDetail(order.orderNumber);
    expect(detailResponse.status()).toBe(200);

    await orderHistoryPage.expectNotShipped();
    await orderHistoryPage.expectNoCancelOrReturnActions();
  });
});
