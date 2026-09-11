# Cross-Service Critical User Journeys — F. Store Locator


### F1. Find nearby stores by postal code

- **User**: Any visitor.
- **Context**: Header `Store Locator` button, or the pickup drawer on PDP.
- **Goal**: Locate a physical store to shop or pick up at.
- **Boundaries**: Storefront UI → Shopper Stores `store-search` (not `stores` — `stores` takes
  explicit ids only; the wrong one answers `400 undefined-query-parameter`).
- **Interactions**: Enter/keep ZIP `94103` → `Find` → radio list of nearby stores with distance,
  contact info, hours.
- **Branches**: In-range and selectable (San Francisco: 0 km, selected by default; San Mateo: 23.83
  km, selectable) vs. out-of-threshold and disabled (Palo Alto: 90.22 km, `radio [disabled]`).
- **Dependencies**: None beyond Shopper Stores.
- **Outcomes**: 3 stores returned, correctly distance-sorted, with the far one correctly disabled
  rather than silently omitted.
- **Criticality**: P1 (feeds E2 pickup).
- **Measurement**: `store-search?...postalCode=94103...` → 200; disabled radio present for
  out-of-range stores.
- **Evidence**: `GET .../store-search?countryCode=US&distanceUnit=km&maxDistance=100&postalCode=94103&siteId=RefArchGlobal&locale=en-US&limit=200`
  → **200**. Results: San Francisco Retail Store (selected), San Mateo Retail Store (23.83 km,
  selectable), Palo Alto Retail Store (90.22 km, radio disabled).

### F2. "Use My Location" geolocation branch

- **User**: Any visitor without location sharing enabled in the automated browser context.
- **Context**: Same Find a Store drawer.
- **Goal**: Skip typing a ZIP by using device location.
- **Boundaries**: Browser Geolocation API → same `store-search` endpoint, lat/long instead of
  postal code.
- **Interactions**: Click `Use My Location`.
- **Branches**: Permission denied (this environment) vs. granted (not exercised).
- **Outcomes**: Clear inline copy — **"To use your location, enable location sharing."** — rather
  than a silent failure or crash.
- **Criticality**: P2.
- **Measurement**: Fallback copy renders instead of an unhandled error.
- **Evidence**: Denied-permission state confirmed rendering the exact fallback copy above, with the
  ZIP-based list still fully usable underneath.

---
