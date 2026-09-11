# Cross-Service Critical User Journeys — G. Localization


### G1. Switch storefront language

- **User**: Any visitor.
- **Context**: Footer language selector, present on every page.
- **Goal**: View the storefront in a different locale.
- **Boundaries**: Storefront UI routing (`/global/{locale}/...`) → re-render with locale-specific
  copy and currency.
- **Interactions**: Select a language from the footer combobox.
- **Branches**: Any of 11 listed locales; verified `en-US ↔ de-DE` round trip.
- **Dependencies**: `sites[0].l10n.supportedLocales` (live config) drives the option list and each
  locale's `preferredCurrency`.
- **Outcomes**: URL prefix changes (`/global/en-US/...` → `/global/de-DE/...`), page content and the
  selector itself re-render in the new language, and the trip is reversible.
- **Criticality**: P1.
- **Measurement**: URL locale segment matches selection; selector's own label translates too
  (`Select Language` → `Sprache auswählen`).
- **Evidence**: Selecting **German (Germany)** navigated to `/global/de-DE/category/gift-certificates`;
  footer selector re-rendered as **"Sprache auswählen"** with German option labels (`Englisch
(USA)`, `Deutsch (Deutschland)` selected, etc.). Selecting **Englisch (USA)** returned to
  `/global/en-US/...` cleanly. Note: the German render logged **98 console warnings** (vs. single
  digits on English pages) — flagged under Known Gaps below, not blocking.

### G2. Config-off catalogue gap — Gift Certificates category

- **User**: Any visitor clicking the persistent `Gift Certificates` nav link.
- **Context**: `/category/gift-certificates`, reachable from every page's main nav.
- **Goal**: N/A — documents a live catalogue gap distinct from a feature flag.
- **Interactions**: Click `Gift Certificates` in the header.
- **Outcomes**: Heading renders **"Gift Certificates (0)"** with body copy _"We couldn't find
  anything for Gift Certificates. Try searching for a product or Contact Us."_ — the nav entry and
  route both work; the catalogue behind it is simply empty on this demo.
- **Criticality**: P2 — worth tracking so a future non-zero count isn't mistaken for a regression,
  and a persistent zero isn't mistaken for a broken link.
- **Measurement**: Category heading count.
- **Evidence**: `GET .../categories/gift-certificates` and the corresponding `product-search` both
  returned 200; UI count is **"(0)"** both in English and confirmed the link/route itself is not a 404.

---
