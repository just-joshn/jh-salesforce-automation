import { clients, expect, probeSfraRoute, test } from '../support/fixtures';
import { PRIMARY_ADDRESS, PRODUCTS, TEST_VISA } from '../support/test-data';
import { placeSignedInOrder } from '../support/workflows';

const SFRA_ROUTES = ['Home-Show', 'Cart-Show', 'Login-Show'] as const;

test.describe(
  'H. Hybrid Continuity & Order Management (config-off complements)',
  { tag: ['@hybrid-continuity', '@config-off'] },
  () => {
    test(
      'H1 - PWA Kit <-> SFRA session/basket continuity is correctly absent',
      { tag: '@smoke' },
      async ({ request }) => {
        for (const route of SFRA_ROUTES) {
          const status = await probeSfraRoute(request, route);
          expect(status, `${route} should 404 — no SFRA storefront is co-deployed here`).toBe(404);
        }
      },
    );

    test(
      'H2 - Shipment tracking, cancellation, and returns have nothing to act on (OMS not connected)',
      { tag: ['@destructive', '@nightly'] },
      async ({ request, workerAccount }) => {
        const session = {
          accessToken: workerAccount.accessToken,
          customerId: workerAccount.customerId,
        };
        const { order } = await placeSignedInOrder(
          request,
          session,
          { productId: PRODUCTS.hoopEarring.variantId, price: PRODUCTS.hoopEarring.unitPrice },
          PRIMARY_ADDRESS,
          TEST_VISA,
        );
        const orderNo = order.orderNo ?? '';

        const detail = await clients.orders(request).getOrder(workerAccount.accessToken, orderNo);
        expect(detail.orderNo).toBe(orderNo);

        await test.step('The order is not shipped and carries no tracking data', () => {
          for (const shipment of detail.shipments ?? []) {
            expect(shipment.shippingStatus).toBe('not_shipped');
            expect(shipment.trackingNumber).toBeUndefined();
          }
        });

        await test.step('The OMS connection itself answers "not active" — no tracking, cancel, or return can exist', async () => {
          const oms = await clients.orders(request).getOmsMetadata(workerAccount.accessToken);
          expect(oms.status).toBe(409);
          expect(oms.body).toMatchObject({
            title: expect.stringMatching(/oms/i),
          });
        });
      },
    );
  },
);
