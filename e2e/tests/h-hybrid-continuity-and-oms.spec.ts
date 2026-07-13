import { expect, test } from '../support/fixtures';
import { placeSignedInOrder } from '../support/workflows';

const SFRA_ROUTES = ['Home-Show', 'Cart-Show', 'Login-Show'] as const;

test.describe(
  'H. Hybrid Continuity & Order Management (config-off complements)',
  { tag: ['@hybrid-continuity', '@config-off'] },
  () => {
    test(
      'H1 - PWA Kit <-> SFRA session/basket continuity is correctly absent',
      { tag: '@smoke' },
      async ({ page }) => {
        for (const route of SFRA_ROUTES) {
          const response = await page.goto(
            `/on/demandware.store/Sites-RefArchGlobal-Site/en_US/${route}`,
          );
          expect(
            response?.status(),
            `${route} should 404 — no SFRA storefront is co-deployed here`,
          ).toBe(404);
        }
      },
    );

    test(
      'H2 - Shipment tracking, cancellation, and returns have nothing to act on (OMS not connected)',
      { tag: ['@destructive', '@nightly'] },
      async ({ signedInPage: page, orderHistoryPage }) => {
        const order = await placeSignedInOrder(page);

        const detailResponse = await orderHistoryPage.gotoDetail(order.orderNumber);
        expect(detailResponse.status()).toBe(200);

        await orderHistoryPage.expectNotShipped();
        await orderHistoryPage.expectNoCancelOrReturnActions();
      },
    );
  },
);
