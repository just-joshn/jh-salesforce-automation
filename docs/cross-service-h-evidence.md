# Cross-Service Critical User Journeys — H. Hybrid Continuity & Order Management (config-off complements)


### H1. PWA Kit ↔ SFRA session/basket continuity

- **Boundaries**: Direct SFRA controller routes on the same host.
- **Interactions**: Navigated directly to `Home-Show`, `Cart-Show`, `Login-Show` under
  `/on/demandware.store/Sites-RefArchGlobal-Site/en_US/...`.
- **Outcomes**: All three returned **HTTP 404** ("The page you're looking for can't be found."),
  consistent with there being no SFRA storefront co-deployed on this demo.
- **Criticality**: N/A — confirms the journey correctly gates off rather than throwing.
- **Evidence**: `GET .../Home-Show` → 404; `GET .../Cart-Show` → 404; `GET .../Login-Show` → 404.

### H2. Shipment tracking, order cancellation, order returns

- **Boundaries**: Order Management (OMS) connection via Shopper Orders' `oms`/`oms_shipments`
  expansions.
- **Interactions**: Opened order detail for a real, just-placed order (00291357) with
  `expand=oms,+oms_shipments`.
- **Outcomes**: Tracking panel renders **"Not shipped"** with no carrier/tracking-number data and
  no cancel/return affordance — consistent with OMS not being connected on this demo.
- **Criticality**: N/A — confirms the three OMS-dependent journeys correctly have nothing to act on
  rather than erroring.
- **Evidence**: `GET .../orders/00291357?expand=oms,+oms_shipments` → 200, UI Tracking section:
  **"Not shipped."** No Cancel or Return controls present anywhere in the order-detail UI.

---
