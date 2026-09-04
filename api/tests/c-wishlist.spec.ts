import { clients, expect, test } from '../support/fixtures';
import { PRODUCTS } from '../support/test-data';
import { getOrCreateBasket } from '../support/workflows';

test.describe('C. Wishlist', { tag: '@wishlist' }, () => {
  test('C1 - Add a product to the wishlist (guest-authenticated)', {
    tag: ['@destructive', '@nightly'],
  }, async ({ request, workerAccount }) => {
    const customers = clients.customers(request);

    await customers.clearWishlistItems(workerAccount.accessToken, workerAccount.customerId);

    try {
      await test.step('First add creates the default list and the item appears in it', async () => {
        const list = await customers.getOrCreateWishlist(
          workerAccount.accessToken,
          workerAccount.customerId,
        );
        expect(list.type).toBe('wish_list');
        expect(list.id).toBeTruthy();

        const item = await customers.addWishlistItem(
          workerAccount.accessToken,
          workerAccount.customerId,
          list.id ?? '',
          PRODUCTS.hoopEarring.variantId,
        );
        expect(item.productId).toBe(PRODUCTS.hoopEarring.variantId);
        expect(item.quantity).toBe(1);
      });

      await test.step('Duplicate add is a clean no-op: same item returned, no second row', async () => {
        const list = await customers.getOrCreateWishlist(
          workerAccount.accessToken,
          workerAccount.customerId,
        );
        const listId = list.id ?? '';
        const first = await customers.addWishlistItem(
          workerAccount.accessToken,
          workerAccount.customerId,
          listId,
          PRODUCTS.hoopEarring.variantId,
        );
        const duplicate = await customers.addWishlistItem(
          workerAccount.accessToken,
          workerAccount.customerId,
          listId,
          PRODUCTS.hoopEarring.variantId,
        );
        expect(duplicate.id).toBe(first.id);
        expect(duplicate.quantity).toBe(1);

        const after = await customers.getWishlist(
          workerAccount.accessToken,
          workerAccount.customerId,
          listId,
        );
        const rows = after.customerProductListItems ?? [];
        expect(rows.filter((row) => row.productId === PRODUCTS.hoopEarring.variantId)).toHaveLength(
          1,
        );
      });
    } finally {
      await customers.clearWishlistItems(workerAccount.accessToken, workerAccount.customerId);
    }
  });

  test('C2 - Remove an item from the wishlist', { tag: ['@destructive', '@nightly'] }, async ({
    request,
    workerAccount,
  }) => {
    const customers = clients.customers(request);

    await customers.clearWishlistItems(workerAccount.accessToken, workerAccount.customerId);

    try {
      const list = await customers.getOrCreateWishlist(
        workerAccount.accessToken,
        workerAccount.customerId,
      );
      const listId = list.id ?? '';
      const item = await customers.addWishlistItem(
        workerAccount.accessToken,
        workerAccount.customerId,
        listId,
        PRODUCTS.hoopEarring.variantId,
      );
      if (!item.id) {
        throw new Error('wishlist item carries no id');
      }

      const removal = await customers.removeWishlistItem(
        workerAccount.accessToken,
        workerAccount.customerId,
        listId,
        item.id,
      );
      expect(removal.status()).toBe(204);

      const after = await customers.getWishlist(
        workerAccount.accessToken,
        workerAccount.customerId,
        listId,
      );
      expect(after.customerProductListItems ?? []).toEqual([]);
    } finally {
      await customers.clearWishlistItems(workerAccount.accessToken, workerAccount.customerId);
    }
  });

  test('C3 - Copy a wishlist item to cart', { tag: ['@destructive', '@nightly'] }, async ({
    request,
    workerAccount,
  }) => {
    const customers = clients.customers(request);
    const baskets = clients.baskets(request);
    const session = {
      accessToken: workerAccount.accessToken,
      customerId: workerAccount.customerId,
    };

    await customers.clearWishlistItems(workerAccount.accessToken, workerAccount.customerId);

    let basketId: string | undefined;
    try {
      await test.step('Start from an empty cart so the item-count assertions are unambiguous', async () => {
        const resolved = await getOrCreateBasket(request, session);
        basketId = resolved.basketId;
        await baskets.clearItems(session.accessToken, basketId);
      });

      const list = await customers.getOrCreateWishlist(
        workerAccount.accessToken,
        workerAccount.customerId,
      );
      await customers.addWishlistItem(
        workerAccount.accessToken,
        workerAccount.customerId,
        list.id ?? '',
        PRODUCTS.hoopEarring.variantId,
      );

      await test.step('Adding to cart copies the item into the basket', async () => {
        const resolved = await getOrCreateBasket(request, session);
        basketId = resolved.basketId;
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

      await test.step('The wishlist row is left untouched — this is a copy, not a move', async () => {
        const wishlist = await customers.getWishlist(
          workerAccount.accessToken,
          workerAccount.customerId,
          list.id ?? '',
        );
        const rows = wishlist.customerProductListItems ?? [];
        expect(rows).toHaveLength(1);
        expect(rows[0]?.quantity).toBe(1);
      });
    } finally {
      try {
        await customers.clearWishlistItems(workerAccount.accessToken, workerAccount.customerId);
      } finally {
        if (basketId) {
          await baskets.clearItems(session.accessToken, basketId);
        }
      }
    }
  });
});
