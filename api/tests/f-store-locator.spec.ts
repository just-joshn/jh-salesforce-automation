import { clients, expect, test } from '../support/fixtures';
import { STORES, STORE_LOCATOR_GEO, STORE_LOCATOR_ZIP } from '../support/test-data';

test.describe('F. Store Locator', { tag: '@store-locator' }, () => {
  test('F1 - Find nearby stores by postal code', { tag: '@smoke' }, async ({
    request,
    guestSession,
  }) => {
    const stores = await clients
      .stores(request)
      .searchByPostalCode(guestSession.accessToken, STORE_LOCATOR_ZIP);

    expect(stores.map((store) => store.name)).toEqual(
      expect.arrayContaining([STORES.nearest.name, STORES.inRange.name, STORES.outOfRange.name]),
    );

    await test.step('Results are distance-sorted, nearest first', () => {
      const distances = [0, 1, 2].map((i) => stores[i]?.distance ?? Number.NaN);
      expect(distances[0]).toBeLessThanOrEqual(distances[1] ?? Number.POSITIVE_INFINITY);
      expect(distances[1] ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
        distances[2] ?? Number.POSITIVE_INFINITY,
      );
      expect(stores[0]).toMatchObject({ name: STORES.nearest.name });
    });

    await test.step('The out-of-range store is returned, not silently omitted', () => {
      expect(stores.map((store) => store.name)).toContain(STORES.outOfRange.name);
    });
  });

  test('F2 - "Use My Location" geolocation branch', { tag: '@smoke' }, async ({
    request,
    guestSession,
  }) => {
    const stores = await clients
      .stores(request)
      .searchByCoordinates(
        guestSession.accessToken,
        STORE_LOCATOR_GEO.latitude,
        STORE_LOCATOR_GEO.longitude,
      );

    expect(stores.length).toBeGreaterThan(0);
    expect(stores[0]?.name).toBe(STORES.nearest.name);
    expect(stores[0]?.distance ?? Number.POSITIVE_INFINITY).toBeLessThan(5);
  });
});
