# Cross-Service Critical User Journeys — A. Discovery & Browse


### A1. Search for a product by keyword

- **User**: Any visitor (guest or signed-in).
- **Context**: Header search box, any page.
- **Goal**: Find a specific product fast.
- **Boundaries**: Storefront UI → Shopper Search (SCAPI) → Einstein-backed suggestions.
- **Interactions**: Type into search box → suggestion dropdown appears (categories, popular
  searches, product thumbnails) → "View All" or Enter → results page.
- **Branches**: Query with matches (suggestions + results) vs. no-match query.
- **Dependencies**: `search-suggestions` endpoint, `product-search` endpoint.
- **Outcomes**: Suggestion dialog populates within one keystroke debounce; results page shows a
  count heading.
- **Criticality**: P0 — primary discovery path.
- **Measurement**: `search-suggestions` returns 200 with `includeEinsteinSuggestedPhrases=true`;
  results heading count > 0.
- **Evidence**: `q=tie` → `GET .../search-suggestions?...&includeEinsteinSuggestedPhrases=true` →
  **200**, returned category chip "Ties", 5 product suggestions, "Popular Searches: shirt",
  `View All` → `/search?q=tie`. `q=shirt` results page: heading **"shirt" (46)**.

### A2. Browse a category and refine by facet

- **User**: Any visitor.
- **Context**: Category landing page (e.g., Womens).
- **Goal**: Narrow a large catalogue to relevant items.
- **Boundaries**: Storefront UI → Shopper Search (SCAPI, `refine=cgid=...`) → Shopper Products
  (category metadata).
- **Interactions**: Land on category → apply color/price/size/store-availability filters → chip
  appears → "Clear All" removes it.
- **Branches**: Facet narrows results vs. facet returns zero vs. filter cleared.
- **Dependencies**: `product-search` with `refine` params; `categories/{id}`.
- **Outcomes**: Result count updates; removable filter chip renders; URL/refine params stay in
  sync.
- **Criticality**: P0.
- **Measurement**: Result count changes match the applied refine; `refine=ilids=...` present when
  store-availability is checked.
- **Evidence**: Womens landing → **558** products (`refine=cgid=womens`, 200). Checking **"In stock
  at San Francisco Retail Store"** → new request adds `&refine=ilids=inventory_m_store_store1` →
  200 → heading **(9)**, chip **"Remove filter: In stock at San Francisco Retail Store"** rendered,
  `Clear All` present. Removing the chip restored the full **558** count.

### A3. Absent feature complement — Guided Shopping Agent

- **User**: Any visitor.
- **Context**: `commerceAgent.enabled` ships as the **string** `"false"` (compare exactly, never by
  truthiness).
- **Goal**: N/A — proving the absence is intentional, not a broken page.
- **Boundaries**: `#mobify-data` config only; no agent service is contacted.
- **Interactions**: Search for "tie" and inspect every entry point (header button, floating button,
  search-suggestions panel) for an agent affordance.
- **Branches**: None — this is a config-off complement, not a live journey.
- **Dependencies**: None (no agent host reachable).
- **Outcomes**: Search suggestions still work fully; zero agent UI anywhere.
- **Criticality**: N/A (documents an intentional absence).
- **Measurement**: `commerceAgent.enableAgentFromHeader`, `...FromFloatingButton`,
  `...FromSearchSuggestions` all string `"false"`.
- **Evidence**: Live config: `commerceAgent: {enabled:"false", askAgentOnSearch:"false",
enableAgentFromHeader:"false", enableAgentFromFloatingButton:"false",
enableAgentFromSearchSuggestions:"false", embeddedServiceEndpoint:"", scrt2Url:"",
salesforceOrgId:""}`. `find --regex '/agent|Agent|Ask|guided/'` on the search-suggestions panel →
  **no matches**. Search suggestions for "tie" fully functional in the same pass (see A1).

---
