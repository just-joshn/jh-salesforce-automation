import { clients, expect, test } from '../support/fixtures';
import { readAppConfig } from '../support/app-config';
import { PRODUCTS } from '../support/test-data';

test.describe('A. Discovery & Browse', { tag: '@discovery' }, () => {
  test(
    'A1 - Search for a product by keyword',
    { tag: ['@critical', '@smoke'] },
    async ({ request, guestSession }) => {
      const search = clients.search(request);

      await test.step('A matching query returns Einstein-backed suggestions the shopper can pick', async () => {
        const suggestions = await search.searchSuggestions(guestSession.accessToken, 'tie');

        // The suggestion contract the UI renders: product cards plus a category chip.
        const products = suggestions.productSuggestions?.products ?? [];
        expect(products.length).toBeGreaterThan(0);
        expect(products.map((p) => p.productName)).toContain(PRODUCTS.silkTie.name);
        expect(suggestions.categorySuggestions?.categories?.map((c) => c.name)).toContain('Ties');
      });

      await test.step('Submitting the query returns a result set with a non-zero total', async () => {
        const results = await search.productSearch(guestSession.accessToken, { q: 'tie' });
        expect(results.total).toBeGreaterThan(0);
      });

      await test.step('A query with no matches degrades gracefully instead of breaking', async () => {
        const results = await search.productSearch(guestSession.accessToken, {
          q: 'zzzz-cuj-no-match-xyz',
        });
        expect(results.total).toBe(0);
      });
    },
  );

  test(
    'A2 - Browse a category and refine by facet',
    { tag: '@smoke' },
    async ({ request, guestSession }) => {
      const search = clients.search(request);

      const category = await search.productSearch(guestSession.accessToken, {
        refinements: ['cgid=womens'],
      });
      expect(category.total).toBeGreaterThan(0);
      const initialCount = category.total ?? 0;

      await test.step('Applying a color facet narrows the result set', async () => {
        const refined = await search.productSearch(guestSession.accessToken, {
          refinements: ['cgid=womens', 'c_refinementColor=Black'],
        });
        expect(refined.total).toBeLessThan(initialCount);
        expect(refined.total).toBeGreaterThan(0);
      });

      await test.step('Omitting the facet restores the unfiltered count', async () => {
        const cleared = await search.productSearch(guestSession.accessToken, {
          refinements: ['cgid=womens'],
        });
        expect(cleared.total).toBe(initialCount);
      });
    },
  );

  test(
    'A3 - Guided Shopping Agent is intentionally absent (config-off complement)',
    { tag: ['@config-off', '@smoke'] },
    async ({ request, guestSession }) => {
      const config = await readAppConfig(request);

      // Compared exactly, never by truthiness — the demo ships this as the *string* "false".
      expect(config.commerceAgent.enabled).toBe('false');
      expect(config.commerceAgent.enableAgentFromHeader).toBe('false');
      expect(config.commerceAgent.enableAgentFromFloatingButton).toBe('false');
      expect(config.commerceAgent.enableAgentFromSearchSuggestions).toBe('false');

      await test.step('Search still works fully with the agent off', async () => {
        const suggestions = await clients
          .search(request)
          .searchSuggestions(guestSession.accessToken, 'tie');
        expect((suggestions.productSuggestions?.products ?? []).length).toBeGreaterThan(0);
      });
    },
  );
});
