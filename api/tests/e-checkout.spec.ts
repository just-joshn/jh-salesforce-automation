import type { APIRequestContext } from '@playwright/test';
import { clients, expect, test } from '../support/fixtures';
import { readAppConfig } from '../support/app-config';
import {
  PICKUP_BILLING_ADDRESS,
  PRIMARY_ADDRESS,
  PRODUCTS,
  rejectedEmail,
  SECONDARY_ADDRESS,
  STORES,
  TEST_VISA,
  uniqueEmail,
} from '../support/test-data';
import {
  getOrCreateBasket,
  placeMultiShipOrder,
  placePickupOrder,
  placeSignedInOrder,
} from '../support/workflows';

test.describe('E. Checkout', { tag: '@checkout' }, () => {
  test(
    'E1 - Guest checkout — Ship to Address (Standard Delivery Purchase)',
    { tag: ['@critical', '@destructive', '@nightly'] },
    async ({ request, guestSession }) => {
      const baskets = clients.baskets(request);
      const orders = clients.orders(request);
      const session = {
        accessToken: guestSession.accessToken,
        customerId: guestSession.customerId,
      };

      // Prepare the full order once: item, shipping, payment, billing — everything but a
      // deliverable contact email.
      const { basketId } = await getOrCreateBasket(request, session);
      await baskets.addItem(session.accessToken, basketId, PRODUCTS.silkTie.variantId, 29.99);
      await baskets.setShippingAddress(session.accessToken, basketId, PRIMARY_ADDRESS);
      const methods = await baskets.getShippingMethods(session.accessToken, basketId, 'me');
      const methodId = requireShippingMethodId(methods);
      await baskets.setShippingMethod(session.accessToken, basketId, 'me', methodId);
      const { instrumentId } = await baskets.setCreditCardPayment(
        session.accessToken,
        basketId,
        TEST_VISA,
      );
      await baskets.setBillingAddress(session.accessToken, basketId, PRIMARY_ADDRESS);
      const prepared = await baskets.getBasket(session.accessToken, basketId);
      await baskets.pinPaymentAmount(
        session.accessToken,
        basketId,
        instrumentId,
        prepared.orderTotal ?? 0,
      );

      await test.step('A platform-rejected email fails at order placement with a real fault', async () => {
        await baskets.setCustomerEmail(session.accessToken, basketId, rejectedEmail('checkout'));
        const refused = await orders.placeOrderRaw(session.accessToken, basketId);
        expect(refused.status()).toBeGreaterThanOrEqual(400);
      });

      await test.step('Editing to a deliverable email preserves the rest of the order and succeeds', async () => {
        const email = uniqueEmail('checkout');
        await baskets.setCustomerEmail(session.accessToken, basketId, email);

        const placed = await orders.placeOrder(session.accessToken, basketId);
        expect(placed).toMatchObject({
          orderNo: expect.any(String),
          customerInfo: { email },
          shipments: [
            {
              shippingAddress: expect.objectContaining({ address1: PRIMARY_ADDRESS.address }),
            },
          ],
          paymentInstruments: expect.arrayContaining([
            expect.objectContaining({ paymentMethodId: 'CREDIT_CARD' }),
          ]),
        });
        expect(placed.orderTotal).toBeGreaterThan(0);
      });
    },
  );

  test(
    'E2 - Guest checkout — Buy Online, Pick Up In Store',
    { tag: ['@critical', '@destructive', '@nightly'] },
    async ({ request, guestSession }) => {
      const stores = await clients
        .stores(request)
        .searchByPostalCode(guestSession.accessToken, '94103');
      const store = stores[0];
      if (!store) {
        throw new Error('store-search returned no stores');
      }
      expect(store.name).toBe(STORES.nearest.name);

      const session = {
        accessToken: guestSession.accessToken,
        customerId: guestSession.customerId,
      };
      const { order } = await placePickupOrder(
        request,
        session,
        uniqueEmail('pickup'),
        {
          productId: PRODUCTS.hoopEarring.variantId,
          price: PRODUCTS.hoopEarring.unitPrice,
          inventoryId: STORES.nearest.inventoryId,
        },
        store,
        PICKUP_BILLING_ADDRESS,
        TEST_VISA,
      );

      expect(order.orderNo).toBeTruthy();
      await test.step('The order is fulfilled as store pickup at the resolved store', () => {
        expect(order.shipments).toEqual([
          expect.objectContaining({
            shippingMethod: expect.objectContaining({
              id: expect.stringMatching(/005$/),
              name: 'Store Pickup',
              c_storePickupEnabled: true,
            }),
            shippingTotal: 0,
          }),
        ]);
      });
    },
  );

  test(
    'E3 - Multi-Shipment Checkout (split delivery to two addresses)',
    { tag: ['@critical', '@destructive', '@nightly'] },
    async ({ request, guestSession }) => {
      const config = await readAppConfig(request);
      expect(config.multishipEnabled).toBe(true);

      const session = {
        accessToken: guestSession.accessToken,
        customerId: guestSession.customerId,
      };
      const { order } = await placeMultiShipOrder(
        request,
        session,
        uniqueEmail('multiship'),
        { productId: PRODUCTS.hoopEarring.variantId, price: PRODUCTS.hoopEarring.unitPrice },
        { productId: PRODUCTS.silkTie.variantId, price: 29.99 },
        PRIMARY_ADDRESS,
        SECONDARY_ADDRESS,
        TEST_VISA,
      );

      expect(order.orderNo).toBeTruthy();
      expect(order.shipments?.length).toBe(2);

      await test.step('Each delivery group carries its own address and line item', () => {
        expect(order.shipments).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              shippingAddress: expect.objectContaining({ address1: PRIMARY_ADDRESS.address }),
            }),
            expect.objectContaining({
              shippingAddress: expect.objectContaining({ address1: SECONDARY_ADDRESS.address }),
            }),
          ]),
        );
        // Line items carry their shipmentId at order level in this API version.
        const tieLine = order.productItems?.find((i) => i.productId === PRODUCTS.silkTie.variantId);
        const tieShipment = order.shipments?.find((s) => s.shipmentId === tieLine?.shipmentId);
        expect(tieShipment?.shippingAddress?.address1).toBe(SECONDARY_ADDRESS.address);
      });

      await test.step('Both groups reconcile into one order total', () => {
        expect(order.productItems).toHaveLength(2);
        expect(order.orderTotal).toBeGreaterThan(0);
      });
    },
  );

  test(
    'E4 - Signed-in checkout (contact info pre-authenticated)',
    { tag: ['@critical', '@destructive', '@nightly'] },
    async ({ request, workerAccount }) => {
      const session = {
        accessToken: workerAccount.accessToken,
        customerId: workerAccount.customerId,
      };
      const { order } = await placeSignedInOrderFor(request, session);

      await test.step('Contact info is the authenticated account, not a guest email', () => {
        expect(order).toMatchObject({
          customerInfo: { customerId: workerAccount.customerId },
        });
        expect(order.customerInfo).not.toHaveProperty('email');
      });

      const history = await clients
        .customers(request)
        .listOrders(workerAccount.accessToken, workerAccount.customerId);
      expect((history.data ?? []).map((entry) => entry.orderNo)).toContain(order.orderNo);
    },
  );

  test(
    'E5 - Checkout payment gaps: PayPal, Salesforce Payments, One-Click (defect vs config-off)',
    { tag: ['@defect', '@destructive', '@nightly'] },
    async ({ request }, testInfo) => {
      const config = await readAppConfig(request);

      await test.step('Salesforce Payments / Express Checkout and One-Click render nothing (config-off)', () => {
        expect(config.sfPayments.enabled).toBe(false);
        expect(config.sfPayments.sdkUrl).toBe('');
        expect(config.sfPayments.metadataUrl).toBe('');
        expect(config.oneClickCheckout.enabled).toBe(false);
      });

      await test.step('PayPal radio cannot be selected by pointer — tracked as a live defect', () => {
        // The defect is browser-only: a sibling label intercepts every pointer event on the
        // PayPal radio, so no PayPal request can even be issued from this storefront — the
        // API-level signature of the defect is precisely that no such request exists to
        // replay. Evidenced in the e2e suite (E5); recorded here, not papered over.
        testInfo.annotations.push({
          type: 'known-defect',
          description:
            'PayPal radio cannot be selected by pointer, keyboard, or direct DOM click — see E5. ' +
            'Browser-only defect; no PayPal payment request can be issued from this storefront.',
        });
      });
    },
  );
});

function requireShippingMethodId(methods: {
  applicableShippingMethods: { id: string; name: string; price: number }[];
}): string {
  const ground =
    methods.applicableShippingMethods.find((method) => /ground/i.test(method.name)) ??
    methods.applicableShippingMethods[0];
  if (!ground) {
    throw new Error('no applicable shipping method');
  }
  return ground.id;
}

function placeSignedInOrderFor(
  request: APIRequestContext,
  session: { accessToken: string; customerId: string },
) {
  return placeSignedInOrder(
    request,
    session,
    { productId: PRODUCTS.hoopEarring.variantId, price: PRODUCTS.hoopEarring.unitPrice },
    PRIMARY_ADDRESS,
    TEST_VISA,
  );
}
