# Cross-Service Cross-Cutting Evidence

These fire on nearly _every_ page load across every journey above, so they're documented once
rather than repeated per journey:

1. **Storefront Configuration API — 403 on every page.**
   `GET .../configuration/shopper-configurations/v1/organizations/f_ecom_zzrf_001/configurations?siteId=RefArchGlobal`
   returns **403** consistently. The app tolerates this gracefully (falls back to `#mobify-data`),
   but it's a genuine live-service failure worth monitoring, not cosmetic.
2. **Shopper Context — 404 on every session.**
   `GET .../shopper-context/v1/.../shopper-context/{usid}` returns **404** for every generated
   session ID observed, guest and authenticated alike.
3. **Data Cloud web events — DNS failure.** Every page fires
   `POST https://g82wgnrvm-ywk9dggrrw8mtggy.pc-rnd.c360a.salesforce.com/web/events/{id}/` which
   fails with **`net::ERR_NAME_NOT_RESOLVED`** — the Data Cloud ingestion hostname doesn't resolve
   from this environment. Analytics/personalization signal is silently lost on every journey above.
4. **Cross-journey email-domain validation.** Both registration (B1) and guest checkout contact
   info (E1) reject `@example.com` addresses with a clear inline error, while `@outlook.com`
   addresses succeed — the same validation service backs both entry points, so a fix or regression
   in one likely affects the other.
5. **React hydration warnings under non-English locales.** The `de-DE` render produced roughly 10×
   the console warning volume of `en-US` renders on comparable pages (98 vs. single digits) — noted
   for follow-up, did not block any interaction observed.

---
