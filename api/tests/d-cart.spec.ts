import { clients, expect, test } from '../support/fixtures';
import { PRODUCTS, uniqueEmail, VALID_PASSWORD } from '../support/test-data';
import { getOrCreateBasket } from '../support/workflows';

test.describe('D. Cart', { tag: '@cart' }, () => {
  test('D1 - Add to cart, adjust quantity, remove', {
    tag: ['@critical', '@destructive', '@nightly'],
  }, async ({ request, guestSession }) => {
    const baskets = clients.baskets(request);
    const session = {
      accessToken: guestSession.accessToken,
      customerId: guestSession.customerId,
    };
    const { basketId } = await getOrCreateBasket(request, session);

    await test.step('Adding an item puts exactly one line in the basket', async () => {
      const basket = await baskets.addItem(
        session.accessToken,
        basketId,
        PRODUCTS.hoopEarring.variantId,
        PRODUCTS.hoopEarring.unitPrice,
      );
      expect(basket.productItems).toEqual([
        expect.objectContaining({
          productId: PRODUCTS.hoopEarring.variantId,
          quantity: 1,
        }),
      ]);
    });

    await test.step('The quantity PATCH re-syncs the line item', async () => {
      const itemId = requireFirstItemId(await baskets.getBasket(session.accessToken, basketId));
      const updated = await baskets.updateItemQuantity(session.accessToken, basketId, itemId, 2);
      expect(updated.productItems).toEqual([expect.objectContaining({ quantity: 2 })]);
    });

    await test.step('Removing the line empties the basket', async () => {
      const itemId = requireFirstItemId(await baskets.getBasket(session.accessToken, basketId));
      const removal = await baskets.removeItem(session.accessToken, basketId, itemId);
      expect(removal.status()).toBe(200);
      const emptied = await baskets.getBasket(session.accessToken, basketId);
      expect(emptied.productItems ?? []).toEqual([]);
    });
  });

  test('D2 - Guest cart merges into account cart on login', {
    tag: ['@destructive', '@nightly'],
  }, async ({ request }) => {
    const slas = clients.slas(request);
    const customers = clients.customers(request);

    // Session A registers the returning shopper; session B is the guest who shops first.
    const sessionA = await slas.guestToken();
    const email = uniqueEmail('cart-merge');
    const registration = await customers.register(sessionA.access_token, {
      firstName: 'Cuj',
      lastName: 'Merge',
      email,
      password: VALID_PASSWORD,
    });
    expect(registration.status()).toBe(200);

    const guest = await slas.guestToken();
    const baskets = clients.baskets(request);
    const guestSession = { accessToken: guest.access_token, customerId: guest.customer_id };
    const { basketId } = await getOrCreateBasket(request, guestSession);
    const basket = await baskets.addItem(
      guest.access_token,
      basketId,
      PRODUCTS.hoopEarring.variantId,
      PRODUCTS.hoopEarring.unitPrice,
    );
    expect(basket.productItems).toEqual([
      expect.objectContaining({
        productId: PRODUCTS.hoopEarring.variantId,
        quantity: 1,
      }),
    ]);

    await test.step('Login threads the guest usid, then the merge preserves the item', async () => {
      let login: Awaited<ReturnType<typeof slas.loginWithPassword>> | undefined;
      await expect(async () => {
        login = await slas.loginWithPassword(email, VALID_PASSWORD, guest.usid);
        expect(login.status).not.toBe(409);
      }).toPass({ timeout: 10_000 });
      expect(login).toMatchObject({
        status: 303,
        token: { access_token: expect.any(String) },
      });
      const token = requireLoginToken(login);

      const merged = await baskets.mergeBaskets(token);
      expect(merged.productItems).toEqual([
        expect.objectContaining({
          productId: PRODUCTS.hoopEarring.variantId,
          quantity: 1,
        }),
      ]);
    });
  });
});

interface LoginResult {
  status: number;
  token?: { access_token: string };
}

function requireLoginToken(login: LoginResult | undefined): string {
  if (!login?.token?.access_token) {
    throw new Error('login produced no access token');
  }
  return login.token.access_token;
}

function requireFirstItemId(basket: { productItems?: { itemId?: string }[] }): string {
  const itemId = basket.productItems?.[0]?.itemId;
  if (!itemId) {
    throw new Error('basket line carries no itemId');
  }
  return itemId;
}
