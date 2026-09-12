import { expect } from '@playwright/test';
import { withLocale } from './env';
import { ScapiClient } from './scapi-client';
import type { ProductSearchResult, SearchSuggestionResult } from './scapi-types';
import { parseJson } from './response';
import { productSearchSchema, searchSuggestionSchema } from './schemas';

const FAMILY = 'search/shopper-search/v1';

interface ProductSearchOptions {
  q?: string;
  refinements?: readonly string[];
  limit?: number;
  locale?: string;
}

const setOptionalParam = (
  query: URLSearchParams,
  name: string,
  value: string | undefined,
): void => {
  if (value) {
    query.set(name, value);
  }
};

const appendRefinements = (
  query: URLSearchParams,
  refinements: readonly string[] | undefined,
): void => {
  for (const refinement of refinements ?? []) {
    query.append('refine', refinement);
  }
};

const productSearchQuery = (options: ProductSearchOptions): URLSearchParams => {
  const query = new URLSearchParams(withLocale({ limit: String(options.limit ?? 24) }));
  setOptionalParam(query, 'q', options.q);
  setOptionalParam(query, 'locale', options.locale);
  appendRefinements(query, options.refinements);
  return query;
};

export class SearchClient extends ScapiClient {
  async searchSuggestions(accessToken: string, query: string): Promise<SearchSuggestionResult> {
    const response = await this.request.get(this.apiUrl(FAMILY, 'search-suggestions'), {
      headers: this.authed(accessToken),
      params: withLocale({ q: query, limit: '10', includeEinsteinSuggestedPhrases: 'true' }),
    });
    expect(response.status(), 'search suggestions').toBe(200);
    return parseJson<SearchSuggestionResult>(
      response,
      searchSuggestionSchema,
      'search suggestions',
    );
  }

  async productSearch(
    accessToken: string,
    options: ProductSearchOptions = {},
  ): Promise<ProductSearchResult> {
    const query = productSearchQuery(options);

    const response = await this.request.get(`${this.apiUrl(FAMILY, 'product-search')}?${query}`, {
      headers: this.authed(accessToken),
    });
    expect(response.status(), 'product search').toBe(200);
    return parseJson<ProductSearchResult>(response, productSearchSchema, 'product search');
  }
}
