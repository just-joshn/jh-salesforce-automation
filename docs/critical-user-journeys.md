# CUJ 1 — Standard Delivery Purchase

## 1. User Persona

**Name:** Delivery Purchase Shopper
**Segment Type:** Guest or returning customer
**Goal Summary:** Purchase product for delivery.
**Motivation:** Obtain desired product through storefront delivery.
**Pain Points:** Product availability changes; invalid shipping state; basket/payment/order failures.
**Expectations:** Selected product, fulfillment, basket, payment, and order remain consistent through confirmation.

## 2. Job To Be Done (JTBD) Statement

**When** I find a product I want delivered, **I want to** add it to my basket and complete checkout, **so I can** place a confirmed order.

## 3. CUJ Goal

**Complete a delivery purchase and receive confirmed order.**

## 4. Critical Tasks (Touchpoints)

| Step | Task Description                         | Touchpoint (Channel/UI) | Metric (KPI)                             | Emotion |
| ---- | ---------------------------------------- | ----------------------- | ---------------------------------------- | ------- |
| 1    | Find/select purchasable product          | Search/PLP/PDP          | Proposed: product-selection success rate | Unknown |
| 2    | Add product to basket                    | PDP / Add to Cart       | Proposed: add-to-cart success rate       | Unknown |
| 3    | Review basket and start checkout         | Cart                    | Proposed: cart→checkout progression      | Unknown |
| 4    | Provide valid contact, address, shipping | Checkout                | Proposed: fulfillment-step completion    | Unknown |
| 5    | Provide valid payment and place order    | Checkout / Payment      | Proposed: order-submit success rate      | Unknown |
| 6    | Receive order confirmation               | Confirmation            | Proposed: confirmed-order rate           | Unknown |

## 5. Moments of Truth (MOT)

**Step:** 4–5
**MOT:** Shipping/payment state must remain valid and `createOrder` must succeed.
**Emotion:** Unknown — requires research.
**Fix:** Proposed: preserve field state, expose actionable API validation, prevent submission until required basket state valid.

## 6. Pain Points & Insights

| Step | Pain Point                            | Insight / Hypothesis                                             |
| ---- | ------------------------------------- | ---------------------------------------------------------------- |
| 1    | Product can become unavailable        | Hypothesis: late availability changes increase abandonment       |
| 2    | Basket mutation can fail              | Hypothesis: failure without retained selection forces rework     |
| 4    | Address/shipping state can be invalid | Hypothesis: actionable field-level errors reduce recovery effort |
| 5    | Payment/order creation can fail       | Hypothesis: preserving checkout state improves retry completion  |

## 7. Stakeholder Notes

**Cross-functional inputs needed:** Storefront, Search/Catalog, Basket, Checkout, Orders, Payments, UX, Support, Analytics.

**Suggested changes from product/design/support:** Not established by repository. Need analytics, usability tests, support-ticket evidence.

## 8. CUJ Summary

**Type:** Unverified — requires traffic/revenue/OEC evidence.
**Metric Tied To Success:** Proposed: confirmed orders ÷ checkout starters.
**Top 1–2 Improvements to Prioritize:** Proposed: checkout-state recovery; actionable shipping/payment errors.

Repo has active guest-checkout coverage and checkout→order-confirmation implementation.

---

# CUJ 2 — Standard Checkout with Salesforce Payments

## 1. User Persona

**Name:** Salesforce Payments Checkout Shopper
**Segment Type:** Guest or returning customer on Salesforce Payments-enabled site
**Goal Summary:** Pay and complete order.
**Motivation:** Complete purchase using offered payment method.
**Pain Points:** Payment configuration, PSP authorization, post-order payment-update failure.
**Expectations:** Payment and Commerce order remain synchronized.

## 2. Job To Be Done (JTBD) Statement

**When** I am ready to pay for my basket, **I want to** complete payment through an offered method, **so I can** receive a confirmed paid order.

## 3. CUJ Goal

**Complete payment-backed checkout successfully.**

## 4. Critical Tasks (Touchpoints)

| Step | Task Description                | Touchpoint (Channel/UI)   | Metric (KPI)                          | Emotion |
| ---- | ------------------------------- | ------------------------- | ------------------------------------- | ------- |
| 1    | Reach payment-ready checkout    | Checkout                  | Proposed: payment-step reach rate     | Unknown |
| 2    | Load/select payment method      | Salesforce Payments sheet | Proposed: payment-config load success | Unknown |
| 3    | Supply/approve payment data     | Payment UI / PSP          | Proposed: authorization success       | Unknown |
| 4    | Create Commerce order           | Checkout backend          | Proposed: order-create success        | Unknown |
| 5    | Attach/confirm payment on order | Salesforce Payments / PSP | Proposed: payment-confirm success     | Unknown |
| 6    | Reach confirmation              | Confirmation              | Proposed: paid-confirmed-order rate   | Unknown |

## 5. Moments of Truth (MOT)

**Step:** 4–5
**MOT:** Order can exist before final payment update; implementation must recover correctly if payment fails.
**Emotion:** Unknown.
**Fix:** Existing code invokes failed-order recovery/reopen-basket behavior; proposed measurement of recovery success.

## 6. Pain Points & Insights

| Step | Pain Point                                | Insight / Hypothesis                                                            |
| ---- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| 2    | Payment configuration unavailable/invalid | Hypothesis: blocks purchase entirely                                            |
| 3    | PSP declines/errors                       | Hypothesis: clear retry path important                                          |
| 5    | Payment update fails after order creation | Hypothesis: recovery consistency is critical to avoiding order/basket ambiguity |

## 7. Stakeholder Notes

**Inputs needed:** Checkout, Salesforce Payments, PSP owners, Orders, UX, Support, Analytics.

**Suggested changes:** No repository evidence of user-requested changes. Validate recovery UX and payment-error comprehension.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: successful paid orders ÷ payment attempts.
**Top Improvements:** Payment failure recovery; actionable PSP/payment errors.

Code explicitly performs order/payment orchestration and `failOrder(...reopenBasket)` recovery. Feature disabled by default.

---

# CUJ 3 — Express Checkout

## 1. User Persona

**Name:** Express Checkout Shopper
**Segment Type:** Shopper using supported express-payment surface
**Goal Summary:** Purchase with shortened checkout.
**Motivation:** Complete purchase with fewer manual checkout steps.
**Pain Points:** Provider authorization; address/shipping compatibility; payment/order recovery.
**Expectations:** Provider information transfers correctly into valid Commerce order.

## 2. JTBD

**When** an express payment option is available, **I want to** use it to supply checkout/payment information, **so I can** complete my purchase without traversing full manual checkout.

## 3. CUJ Goal

**Complete purchase through Express Checkout.**

## 4. Critical Tasks

| Step | Task Description                | Touchpoint                | Metric (KPI)                         | Emotion |
| ---- | ------------------------------- | ------------------------- | ------------------------------------ | ------- |
| 1    | Invoke express payment          | PDP/Cart/Checkout         | Proposed: express-start rate         | Unknown |
| 2    | Authorize with provider         | PSP UI                    | Proposed: provider-auth success      | Unknown |
| 3    | Prepare basket/address/shipping | Basket APIs               | Proposed: basket-preparation success | Unknown |
| 4    | Create order                    | Shopper Orders            | Proposed: order-create success       | Unknown |
| 5    | Process/confirm payment         | Salesforce Payments / PSP | Proposed: payment success            | Unknown |
| 6    | Reach confirmation              | Confirmation              | Proposed: express completion rate    | Unknown |

## 5. MOT

**Step:** 3–5
**MOT:** Provider data must produce valid basket, shipping, order, and payment state.
**Emotion:** Unknown.
**Fix:** Existing implementation has explicit preparation/payment/fail-order recovery states; measure each separately.

## 6. Pain Points & Insights

| Step | Pain Point                      | Insight / Hypothesis                                           |
| ---- | ------------------------------- | -------------------------------------------------------------- |
| 2    | Provider authorization failure  | Hypothesis: abandonment risk                                   |
| 3    | Shipping method becomes invalid | Hypothesis: express flow loses value if manual repair required |
| 5    | Payment/order recovery fails    | Hypothesis: highest-severity technical failure in path         |

## 7. Stakeholder Notes

Inputs: Cart/PDP, Checkout, Basket, Orders, Salesforce Payments, PSPs, UX, Analytics.

Changes: Validate recovery UX; instrument express-stage failures.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: confirmed express orders ÷ express starts.
**Top Improvements:** Basket-preparation reliability; payment/order recovery.

Dedicated implementation and tests exist.

---

# CUJ 4 — Returning Shopper One Click Checkout

## 1. User Persona

**Name:** Returning One Click Shopper
**Segment Type:** Returning registered customer
**Goal Summary:** Authenticate and purchase using saved checkout data.
**Motivation:** Avoid re-entering known shipping/payment information.
**Pain Points:** OTP failure; basket transfer; stale saved data.
**Expectations:** Authentication preserves basket and exposes reusable customer data.

## 2. JTBD

**When** I return with a basket, **I want to** verify my identity and reuse saved checkout details, **so I can** complete purchase quickly.

## 3. CUJ Goal

**Authenticate returning shopper and complete One Click order.**

## 4. Critical Tasks

| Step | Task Description                  | Touchpoint               | Metric                             | Emotion |
| ---- | --------------------------------- | ------------------------ | ---------------------------------- | ------- |
| 1    | Enter account email/request OTP   | Checkout contact         | Proposed: OTP-request success      | Unknown |
| 2    | Verify OTP                        | OTP UI / SLAS            | Proposed: OTP verification rate    | Unknown |
| 3    | Transfer/merge basket             | Basket service           | Proposed: basket-transfer success  | Unknown |
| 4    | Load/apply saved shipping/payment | Checkout / Customer data | Proposed: saved-data reuse success | Unknown |
| 5    | Place order                       | Checkout / Orders        | Proposed: order success            | Unknown |
| 6    | Reach confirmation                | Confirmation             | Proposed: One Click completion     | Unknown |

## 5. MOT

**Step:** 2–3
**MOT:** Identity changes from guest to registered while current basket must survive.
**Emotion:** Unknown.
**Fix:** Proposed: transactional/observable basket-transfer handling with clear recovery.

## 6. Pain Points & Insights

| Step | Pain Point                  | Insight / Hypothesis                                      |
| ---- | --------------------------- | --------------------------------------------------------- |
| 2    | Invalid/expired OTP         | Hypothesis: resend/recovery clarity affects completion    |
| 3    | Basket transfer failure     | Hypothesis: losing intended items defeats One Click value |
| 4    | Saved data invalid/outdated | Hypothesis: easy correction needed                        |

## 7. Stakeholder Notes

Inputs: Identity/SLAS, Customers, Basket, Checkout, Payments, UX, Support.

Changes: Validate OTP recovery and basket-transition UX.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: confirmed One Click orders ÷ One Click starts.
**Top Improvements:** OTP recovery; basket-transfer reliability.

Implementation authenticates, transfers basket, refetches state, then updates customer/basket data.

---

# CUJ 5 — First-Time One Click Checkout + Account Creation

## 1. User Persona

**Name:** First-Time One Click Shopper
**Segment Type:** First-time shopper
**Goal Summary:** Buy while establishing reusable customer account/checkout data.
**Motivation:** Complete purchase and reduce future re-entry.
**Pain Points:** Verification, account transition, payment-method persistence.
**Expectations:** Account creation does not interrupt or invalidate purchase.

## 2. JTBD

**When** I check out for first time, **I want to** verify myself and optionally save my checkout information, **so I can** complete this order and simplify later purchases.

## 3. CUJ Goal

**Create registered customer state and complete One Click purchase.**

## 4. Critical Tasks

| Step | Task Description                 | Touchpoint                      | Metric                         | Emotion |
| ---- | -------------------------------- | ------------------------------- | ------------------------------ | ------- |
| 1    | Enter/verify identity            | Checkout / OTP                  | Proposed: verification success | Unknown |
| 2    | Establish customer/account state | SLAS / Customers                | Proposed: registration success | Unknown |
| 3    | Supply shipping details          | Checkout                        | Proposed: shipping completion  | Unknown |
| 4    | Supply/save payment              | Checkout / Customers / Payments | Proposed: payment-data success | Unknown |
| 5    | Create order                     | Orders                          | Proposed: order-create success | Unknown |
| 6    | Receive confirmation             | Confirmation                    | Proposed: journey completion   | Unknown |

## 5. MOT

**Step:** 2 and 4–5
**MOT:** Account/profile persistence and order creation span different failure domains.
**Emotion:** Unknown.
**Fix:** Proposed: separate “order success” from “save-for-next-time success” in UI and telemetry.

## 6. Pain Points & Insights

| Step | Pain Point                         | Insight / Hypothesis                                                                                   |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 2    | Registration/auth transition fails | Hypothesis: purchase must remain recoverable                                                           |
| 4    | Saved payment persistence fails    | Existing code treats save failure separately; hypothesis: purchase should not be unnecessarily blocked |
| 5    | Order creation fails               | Hypothesis: retain entered checkout data                                                               |

## 7. Stakeholder Notes

Inputs: Identity, Customer, Checkout, Payments, Basket, Orders, Security.

Changes: Instrument account-save versus order-success separately.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: orders completed ÷ first-time One Click starts; secondary account-save success.
**Top Improvements:** Failure-domain separation; recovery without re-entry.

---

# CUJ 6 — Buy Online, Pick Up In Store

## 1. User Persona

**Name:** Store Pickup Shopper
**Segment Type:** Shopper seeking local fulfillment
**Goal Summary:** Buy product for pickup at chosen store.
**Motivation:** Obtain product through store pickup instead of shipping.
**Pain Points:** Store inventory mismatch; unavailable pickup; fulfillment state changes.
**Expectations:** Selected store and pickup eligibility persist through checkout.

## 2. JTBD

**When** I want to collect a product locally, **I want to** find an eligible store and purchase for pickup, **so I can** receive the item from that location.

## 3. CUJ Goal

**Place confirmed BOPIS order for selected store.**

## 4. Critical Tasks

| Step | Task                                      | Touchpoint    | Metric                             | Emotion |
| ---- | ----------------------------------------- | ------------- | ---------------------------------- | ------- |
| 1    | Find/select store                         | Store Locator | Proposed: valid-store selection    | Unknown |
| 2    | Find store-available product              | PLP/PDP       | Proposed: pickup-product selection | Unknown |
| 3    | Add as Pickup in Store                    | PDP/Cart      | Proposed: pickup add success       | Unknown |
| 4    | Preserve pickup shipment through checkout | Cart/Checkout | Proposed: pickup-shipment validity | Unknown |
| 5    | Pay/place order                           | Checkout      | Proposed: BOPIS order success      | Unknown |
| 6    | Receive pickup confirmation               | Confirmation  | Proposed: confirmed BOPIS rate     | Unknown |

## 5. MOT

**Step:** 1–4
**MOT:** Store selection and inventory/fulfillment state must remain aligned.
**Emotion:** Unknown.
**Fix:** Proposed: revalidate pickup availability before commitment and explain any changed availability.

## 6. Pain Points & Insights

| Step | Pain Point                             | Insight / Hypothesis                                              |
| ---- | -------------------------------------- | ----------------------------------------------------------------- |
| 1    | Store lacks required inventory mapping | Hypothesis: should not present as selectable fulfillment location |
| 2    | Inventory can change                   | Hypothesis: late stock loss is high-friction                      |
| 4    | Pickup shipment becomes invalid        | Hypothesis: preserve clear alternative fulfillment path           |

## 7. Stakeholder Notes

Inputs: Stores, Search, Inventory, Basket, Checkout, Orders, Store Operations, UX.

Changes: Validate inventory-change recovery with store operations/support data.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: confirmed BOPIS orders ÷ BOPIS checkout starts.
**Top Improvements:** Inventory revalidation; pickup-state recovery.

Active E2E follows store locator → PLP/PDP → pickup → cart → checkout.

---

# CUJ 7 — Multi-Shipment Checkout

## 1. User Persona

**Name:** Multi-Destination Shopper
**Segment Type:** Shopper splitting fulfillment
**Goal Summary:** Send basket items to multiple addresses and/or pickup locations in one order.
**Motivation:** Fulfill different items to different destinations.
**Pain Points:** Shipment assignment complexity; invalid shipping methods; empty shipment state.
**Expectations:** Item quantities and fulfillment destinations remain accurate.

## 2. JTBD

**When** items in my basket need different destinations, **I want to** assign each item to the correct shipment, **so I can** place one order with intended fulfillment.

## 3. CUJ Goal

**Create one valid multi-shipment order.**

## 4. Critical Tasks

| Step | Task                                        | Touchpoint           | Metric                                  | Emotion |
| ---- | ------------------------------------------- | -------------------- | --------------------------------------- | ------- |
| 1    | Start multi-shipment checkout               | Checkout             | Proposed: multiship start               | Unknown |
| 2    | Assign products/quantities                  | Shipping UI          | Proposed: assignment success            | Unknown |
| 3    | Supply/select addresses or pickup locations | Shipping UI / Stores | Proposed: destination validation        | Unknown |
| 4    | Select valid shipping methods               | Shipping UI          | Proposed: method-validity rate          | Unknown |
| 5    | Pay/place order                             | Payment/Orders       | Proposed: order success                 | Unknown |
| 6    | Verify fulfillment in confirmation          | Confirmation         | Proposed: correct-shipment confirmation | Unknown |

## 5. MOT

**Step:** 2–4
**MOT:** Address or assignment changes can invalidate shipping method.
**Emotion:** Unknown.
**Fix:** Existing implementation refetches methods; proposed UI explaining why reselection required.

## 6. Pain Points & Insights

| Step | Pain Point                                   | Insight / Hypothesis                                  |
| ---- | -------------------------------------------- | ----------------------------------------------------- |
| 2    | Incorrect quantity/shipment assignment       | Hypothesis: visual shipment grouping reduces mistakes |
| 3    | Destination modification changes eligibility | Hypothesis: dependent state should update immediately |
| 4    | Previously selected method becomes invalid   | Hypothesis: explicit explanation reduces confusion    |

## 7. Stakeholder Notes

Inputs: Basket, Customers/Addresses, Stores, Shipping, Orders, Checkout UX, Analytics.

Changes: Test mixed pickup/delivery comprehension.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: valid multi-shipment orders ÷ multi-shipment starts.
**Top Improvements:** Assignment clarity; shipping-method invalidation recovery.

Mixed-fulfillment handling has tests; multiship defaults enabled.

---

# CUJ 8 — Guided Shopping Agent

## 1. User Persona

**Name:** Agent-Assisted Shopper
**Segment Type:** Shopper using enabled Guided Shopping Agent
**Goal Summary:** Obtain commerce assistance and continue shopping.
**Motivation:** Find relevant products/actions through conversational assistance.
**Pain Points:** Messaging initialization; auth/context bridge failure; unusable result.
**Expectations:** Agent understands commerce context and links back into usable storefront journey.

## 2. JTBD

**When** I need help shopping, **I want to** ask the commerce agent for assistance, **so I can** discover or act on relevant products.

## 3. CUJ Goal

**Receive actionable commerce assistance without losing storefront context.**

## 4. Critical Tasks

| Step | Task                             | Touchpoint                         | Metric                               | Emotion |
| ---- | -------------------------------- | ---------------------------------- | ------------------------------------ | ------- |
| 1    | Open agent                       | Embedded Messaging/Commerce Client | Proposed: launch success             | Unknown |
| 2    | Initialize conversation          | Agent UI                           | Proposed: session-init success       | Unknown |
| 3    | Bridge Commerce identity/context | Token Bridge / SLAS                | Proposed: context-link success       | Unknown |
| 4    | Ask commerce question            | Conversation                       | Proposed: request completion         | Unknown |
| 5    | Receive/use result               | Agent → storefront                 | Proposed: actionable-result rate     | Unknown |
| 6    | Continue shopping action         | PDP/Cart/etc.                      | Proposed: agent→commerce progression | Unknown |

## 5. MOT

**Step:** 2–3
**MOT:** Conversation must successfully bind to Commerce session/context.
**Emotion:** Unknown.
**Fix:** Existing generic failure handling; proposed context-specific initialization/retry diagnostics.

## 6. Pain Points & Insights

| Step | Pain Point                        | Insight / Hypothesis                                |
| ---- | --------------------------------- | --------------------------------------------------- |
| 2    | Agent session fails to initialize | Hypothesis: blocks whole assisted journey           |
| 3    | Token/context bridge fails        | Hypothesis: agent may lose useful commerce context  |
| 5    | Result not actionable             | Requires user research; repository cannot establish |

## 7. Stakeholder Notes

Inputs: Agentforce, Commerce, Identity, Messaging, Storefront UX, Security, Support.

Changes: Measure initialization/context failures and agent-to-commerce continuation.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: usable commerce continuations ÷ agent sessions.
**Top Improvements:** Session/context reliability; actionable failure recovery.

Feature implementation bridges Embedded Messaging/Commerce Client, SLAS and Token Bridge; feature defaults off.

---

# CUJ 9 — Account Registration → Authenticated Session

## 1. User Persona

**Name:** Account-Creation Shopper
**Segment Type:** First-time registered customer
**Goal Summary:** Create customer account and become signed in.
**Motivation:** Access registered-customer capabilities.
**Pain Points:** Registration rejection; immediate login failure.
**Expectations:** Successful registration yields usable authenticated account.

## 2. JTBD

**When** I decide to create an account, **I want to** register my details, **so I can** become an authenticated customer.

## 3. CUJ Goal

**Create customer account and enter authenticated state.**

## 4. Critical Tasks

| Step | Task                           | Touchpoint        | Metric                                    | Emotion |
| ---- | ------------------------------ | ----------------- | ----------------------------------------- | ------- |
| 1    | Open registration              | Registration UI   | Proposed: form-start                      | Unknown |
| 2    | Enter required account details | Registration form | Proposed: valid-submit rate               | Unknown |
| 3    | Create customer record         | Shopper Customers | Proposed: register success                | Unknown |
| 4    | Authenticate new account       | SLAS              | Proposed: post-register login success     | Unknown |
| 5    | Reach registered account state | Account           | Proposed: end-to-end registration success | Unknown |

## 5. MOT

**Step:** 3–4
**MOT:** Customer can be created before immediate authentication completes.
**Emotion:** Unknown.
**Fix:** Proposed: distinguish “account created, login failed” from “registration failed”.

## 6. Pain Points & Insights

| Step | Pain Point                | Insight / Hypothesis                                    |
| ---- | ------------------------- | ------------------------------------------------------- |
| 2    | Invalid/duplicate data    | Hypothesis: field-level guidance improves recovery      |
| 3    | Customer creation failure | Blocks journey                                          |
| 4    | Immediate login failure   | Hypothesis: ambiguous error risks repeated registration |

## 7. Stakeholder Notes

Inputs: Customer API, SLAS/Identity, UX, Security, Support.

Changes: Instrument register and post-register login as separate stages.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: authenticated new accounts ÷ registration submissions.
**Top Improvements:** Error specificity; post-registration authentication recovery.

Auth implementation explicitly calls Shopper Customers registration then SLAS login.

---

# CUJ 10 — Password Login + Guest Cart Preservation

## 1. User Persona

**Name:** Returning Cart-Bearing Shopper
**Segment Type:** Returning registered customer currently shopping as guest
**Goal Summary:** Sign in without losing current cart.
**Motivation:** Recover account while retaining shopping progress.
**Pain Points:** Credential failure; basket merge failure/conflict.
**Expectations:** Authentication does not discard guest-selected products.

## 2. JTBD

**When** I have already added products as a guest, **I want to** sign into my account, **so I can** continue with those products still in my basket.

## 3. CUJ Goal

**Authenticate and preserve pre-login basket.**

## 4. Critical Tasks

| Step | Task                           | Touchpoint     | Metric                               | Emotion |
| ---- | ------------------------------ | -------------- | ------------------------------------ | ------- |
| 1    | Build guest basket             | PDP/Cart       | Proposed: basket exists before login | Unknown |
| 2    | Submit credentials             | Login          | Proposed: auth success               | Unknown |
| 3    | Load registered basket context | Basket service | Proposed: basket-read success        | Unknown |
| 4    | Merge guest/registered baskets | Basket service | Proposed: merge success              | Unknown |
| 5    | Return to shopping/account     | Storefront     | Proposed: cart-preservation rate     | Unknown |

## 5. MOT

**Step:** 3–4
**MOT:** Identity changes while two basket contexts may exist.
**Emotion:** Unknown.
**Fix:** Proposed: deterministic merge feedback/conflict handling.

## 6. Pain Points & Insights

| Step | Pain Point                         | Insight / Hypothesis                                                |
| ---- | ---------------------------------- | ------------------------------------------------------------------- |
| 2    | Invalid credentials                | Known auth failure domain                                           |
| 4    | Merge fails                        | Hypothesis: loss of guest selections strongly undermines continuity |
| 4    | Existing customer basket conflicts | Requires product-policy definition                                  |

## 7. Stakeholder Notes

Inputs: SLAS, Basket, Account, Merchandising, UX, Analytics.

Changes: Define/measure merge conflict policy.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: successful cart-preserving logins ÷ logins initiated with guest basket.
**Top Improvements:** Merge reliability; merge-state transparency.

---

# CUJ 11 — Passwordless Login + Guest Cart Preservation

## 1. User Persona

**Name:** Passwordless Cart-Bearing Shopper
**Segment Type:** Returning customer using passwordless login
**Goal Summary:** Verify identity without password and retain guest cart.
**Motivation:** Authenticate while preserving current shopping progress.
**Pain Points:** OTP delivery/expiry; authentication failure; basket merge.
**Expectations:** Verification leads back to intact cart.

## 2. JTBD

**When** I have a guest basket and want to sign in without a password, **I want to** verify my identity with the passwordless flow, **so I can** continue shopping with my basket intact.

## 3. CUJ Goal

**Complete passwordless authentication and preserve basket.**

## 4. Critical Tasks

| Step | Task                       | Touchpoint                 | Metric                           | Emotion |
| ---- | -------------------------- | -------------------------- | -------------------------------- | ------- |
| 1    | Request passwordless login | Login                      | Proposed: request success        | Unknown |
| 2    | Receive OTP/token          | Email/SMS/callback channel | Proposed: delivery completion    | Unknown |
| 3    | Verify token               | Login / SLAS               | Proposed: verification success   | Unknown |
| 4    | Merge/transfer basket      | Basket service             | Proposed: merge success          | Unknown |
| 5    | Resume storefront journey  | Cart/storefront            | Proposed: preserved-cart success | Unknown |

## 5. MOT

**Step:** 2–4
**MOT:** Authentication depends on token delivery and then basket continuity.
**Emotion:** Unknown.
**Fix:** Proposed: resend/retry paths plus observable basket transfer.

## 6. Pain Points & Insights

| Step | Pain Point            | Insight / Hypothesis                                       |
| ---- | --------------------- | ---------------------------------------------------------- |
| 2    | Token not received    | Hypothesis: resend/status messaging important              |
| 3    | Token invalid/expired | Hypothesis: recovery should avoid restarting whole journey |
| 4    | Basket merge fails    | Continuity failure                                         |

## 7. Stakeholder Notes

Inputs: SLAS, Email/SMS/callback provider when applicable, Basket, UX, Security.

Changes: Separate delivery, verification, and merge telemetry.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: preserved-cart passwordless sessions ÷ passwordless starts with guest basket.
**Top Improvements:** Token recovery; basket merge.

Passwordless feature defaults off.

---

# CUJ 12 — Social Login + Guest Cart Preservation

## 1. User Persona

**Name:** Social Sign-In Shopper
**Segment Type:** Customer using configured social IdP
**Goal Summary:** Authenticate through external provider and retain cart.
**Motivation:** Use existing external identity rather than storefront credential entry.
**Pain Points:** Redirect/auth failure; callback failure; basket merge.
**Expectations:** Return to storefront authenticated with existing cart.

## 2. JTBD

**When** I want to sign in through my external identity provider, **I want to** authenticate there and return to the storefront, **so I can** continue with my shopping context intact.

## 3. CUJ Goal

**Complete federated login and preserve storefront basket.**

## 4. Critical Tasks

| Step | Task                    | Touchpoint        | Metric                               | Emotion |
| ---- | ----------------------- | ----------------- | ------------------------------------ | ------- |
| 1    | Choose social provider  | Login UI          | Proposed: IdP-start rate             | Unknown |
| 2    | Authenticate/authorize  | External IdP      | Proposed: IdP success                | Unknown |
| 3    | Return through callback | Redirect callback | Proposed: callback success           | Unknown |
| 4    | Establish SLAS session  | SLAS              | Proposed: federation success         | Unknown |
| 5    | Merge basket and return | Basket/storefront | Proposed: cart-preserving completion | Unknown |

## 5. MOT

**Step:** 2–5
**MOT:** Journey leaves storefront then must restore identity, basket, and original destination.
**Emotion:** Unknown.
**Fix:** Proposed: robust callback-state preservation and merge recovery.

## 6. Pain Points & Insights

| Step | Pain Point                           | Insight / Hypothesis                                                    |
| ---- | ------------------------------------ | ----------------------------------------------------------------------- |
| 2    | External IdP rejects/fails           | External dependency                                                     |
| 3    | Callback state invalid               | Blocks federation                                                       |
| 5    | Basket merge/return-location failure | Hypothesis: successful auth alone insufficient if shopping context lost |

## 7. Stakeholder Notes

Inputs: Google/Apple or other IdP, SLAS, Basket, Security, UX.

Changes: Test destination restoration and basket preservation.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: authenticated social sessions with preserved basket ÷ social-login starts.
**Top Improvements:** Callback-state recovery; cart merge.

Social redirect performs IdP login followed by basket merge; feature defaults disabled.

---

# CUJ 13 — Password Recovery via External Callback Delivery

## 1. User Persona

**Name:** Password-Recovery Customer
**Segment Type:** Registered customer unable to authenticate
**Goal Summary:** Reset forgotten password.
**Motivation:** Regain account access.
**Pain Points:** Reset delivery failure; invalid/expired token; new-password rejection.
**Expectations:** Reset authorization reaches correct account and produces usable new credential.

## 2. JTBD

**When** I cannot remember my password, **I want to** receive a secure reset action and choose a new password, **so I can** regain account access.

## 3. CUJ Goal

**Successfully reset account password through callback-based delivery.**

## 4. Critical Tasks

| Step | Task                    | Touchpoint                  | Metric                              | Emotion |
| ---- | ----------------------- | --------------------------- | ----------------------------------- | ------- |
| 1    | Request reset           | Reset Password UI           | Proposed: request acceptance        | Unknown |
| 2    | Deliver reset action    | External email/SMS/callback | Proposed: delivery completion       | Unknown |
| 3    | Open reset landing path | Link/UI                     | Proposed: valid-token landing       | Unknown |
| 4    | Enter new password      | Reset form                  | Proposed: valid-password submission | Unknown |
| 5    | Apply password reset    | SLAS                        | Proposed: reset success             | Unknown |
| 6    | Return to login         | Login                       | Proposed: post-reset auth success   | Unknown |

## 5. MOT

**Step:** 2–5
**MOT:** Security token must be delivered, remain valid, and successfully authorize password change.
**Emotion:** Unknown.
**Fix:** Proposed: explicit expired-token/re-request path.

## 6. Pain Points & Insights

| Step | Pain Point                  | Insight / Hypothesis                           |
| ---- | --------------------------- | ---------------------------------------------- |
| 2    | Reset message not delivered | External callback dependency                   |
| 3    | Token expired/invalid       | Hypothesis: direct re-request reduces dead end |
| 5    | Reset mutation rejected     | Needs actionable error                         |

## 7. Stakeholder Notes

Inputs: SLAS/Identity, external email/SMS/callback service, Security, Support.

Changes: Measure delivery-to-reset conversion and token-expiry failures.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: successful resets ÷ accepted reset requests.
**Top Improvements:** Delivery visibility; expired-token recovery.

**Scope constraint:** Cross-service only in callback/external-delivery mode. Default native email mode is not this cross-service CUJ.

---

# CUJ 14 — Hybrid PWA Kit ↔ SFRA Session and Basket Continuity

## 1. User Persona

**Name:** Hybrid Storefront Shopper
**Segment Type:** Shopper traversing PWA Kit and SFRA/SiteGenesis routes
**Goal Summary:** Continue shopping across storefront runtimes without losing session or basket.
**Motivation:** Complete journey regardless of which frontend serves each route.
**Pain Points:** Session desynchronization; lost login; lost basket.
**Expectations:** Runtime transition invisible to shopping continuity.

## 2. JTBD

**When** my journey moves between PWA Kit and SFRA routes, **I want to** retain my identity and basket, **so I can** continue without restarting.

## 3. CUJ Goal

**Preserve shopper session and basket across hybrid runtime boundary.**

## 4. Critical Tasks

| Step | Task                                 | Touchpoint                   | Metric                               | Emotion |
| ---- | ------------------------------------ | ---------------------------- | ------------------------------------ | ------- |
| 1    | Establish shopping/session state     | PWA or SFRA                  | Proposed: baseline session valid     | Unknown |
| 2    | Navigate across runtime boundary     | eCDN/routing                 | Proposed: handoff initiation         | Unknown |
| 3    | Synchronize auth/session identifiers | Hybrid Auth / cookies / SLAS | Proposed: session-sync success       | Unknown |
| 4    | Restore identity                     | Destination runtime          | Proposed: auth-continuity rate       | Unknown |
| 5    | Restore/use basket                   | Destination runtime          | Proposed: basket-continuity rate     | Unknown |
| 6    | Continue intended task               | PWA/SFRA                     | Proposed: cross-runtime continuation | Unknown |

## 5. MOT

**Step:** 3–5
**MOT:** `dwsid`, SLAS/JWT and shopper context must represent same session after handoff.
**Emotion:** Unknown.
**Fix:** Existing auth code handles invalid handoff state; proposed explicit continuity telemetry.

## 6. Pain Points & Insights

| Step | Pain Point                   | Insight / Hypothesis               |
| ---- | ---------------------------- | ---------------------------------- |
| 3    | Stale/truncated auth handoff | Can force fallback session path    |
| 4    | Shopper appears logged out   | Direct continuity failure          |
| 5    | Basket unavailable/different | Direct commerce continuity failure |

## 7. Stakeholder Notes

Inputs: PWA Kit/MRT, SFRA, SLAS, Hybrid Auth, eCDN, Basket, Identity, Platform Operations.

Changes: End-to-end hybrid monitoring keyed to identity + basket continuity.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: runtime transitions preserving both auth and basket ÷ all eligible transitions.
**Top Improvements:** Session-sync observability; automatic basket/session recovery.

---

# CUJ 15 — Track OMS-Managed Shipment

## 1. User Persona

**Name:** Post-Purchase Tracking Customer
**Segment Type:** Registered customer with shipped OMS-managed order
**Goal Summary:** Check shipment progress.
**Motivation:** Know current delivery status/location.
**Pain Points:** Missing tracking data; invalid tracking URL; external carrier availability.
**Expectations:** Correct order exposes valid carrier tracking action when available.

## 2. JTBD

**When** my order has shipped, **I want to** open its tracking information, **so I can** see shipment progress.

## 3. CUJ Goal

**Reach valid carrier tracking information for owned order.**

## 4. Critical Tasks

| Step | Task                       | Touchpoint    | Metric                                     | Emotion |
| ---- | -------------------------- | ------------- | ------------------------------------------ | ------- |
| 1    | Open account/order history | Account       | Proposed: order-detail reach               | Unknown |
| 2    | Load OMS-enriched order    | Order Detail  | Proposed: OMS-data success                 | Unknown |
| 3    | Locate tracking action     | Shipment UI   | Proposed: tracking availability            | Unknown |
| 4    | Validate/open tracking URL | PWA → carrier | Proposed: valid-link rate                  | Unknown |
| 5    | View carrier status        | Carrier site  | External outcome; telemetry may be limited | Unknown |

## 5. MOT

**Step:** 3–4
**MOT:** Tracking link must exist and be safe/valid before redirect.
**Emotion:** Unknown.
**Fix:** Existing implementation rejects unsafe URL; proposed clear “tracking unavailable” state.

## 6. Pain Points & Insights

| Step | Pain Point                    | Insight / Hypothesis                                      |
| ---- | ----------------------------- | --------------------------------------------------------- |
| 2    | OMS shipment data unavailable | Tracking cannot proceed                                   |
| 3    | No externalizable URL         | UI cannot provide carrier navigation                      |
| 4    | Unsafe URL rejected           | Security-correct; user needs fallback tracking identifier |

## 7. Stakeholder Notes

Inputs: Shopper Orders, SOM, carrier integrations, Security, Account UX, Support.

Changes: Distinguish “not shipped”, “no carrier URL”, “invalid URL”.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: valid tracking launches ÷ orders with tracking data.
**Top Improvements:** Tracking-state clarity; carrier-link fallback.

---

# CUJ 16 — Cancel Eligible OMS-Managed Order

## 1. User Persona

**Name:** Order-Cancellation Customer
**Segment Type:** Registered customer with cancellable OMS order
**Goal Summary:** Stop eligible order before fulfillment prevents cancellation.
**Motivation:** Prevent unwanted order from proceeding.
**Pain Points:** Eligibility can change; server conflict; unclear terminal failure.
**Expectations:** UI accurately represents cancellability and authoritative result.

## 2. JTBD

**When** my unfulfilled order is still eligible for cancellation, **I want to** cancel it, **so I can** stop fulfillment.

## 3. CUJ Goal

**Successfully cancel eligible OMS-managed order.**

## 4. Critical Tasks

| Step | Task                            | Touchpoint              | Metric                              | Emotion |
| ---- | ------------------------------- | ----------------------- | ----------------------------------- | ------- |
| 1    | Open eligible order             | Account / Order Detail  | Proposed: eligible-order reach      | Unknown |
| 2    | Verify cancellation eligibility | Order Detail / OMS data | Proposed: eligibility determination | Unknown |
| 3    | Start cancellation              | Cancel Order UI         | Proposed: cancel-start rate         | Unknown |
| 4    | Confirm reason/action           | Modal                   | Proposed: submit rate               | Unknown |
| 5    | Submit to SOM                   | Shopper Orders / SOM    | Proposed: cancel success            | Unknown |
| 6    | View updated canceled state     | Order Detail            | Proposed: state-refresh success     | Unknown |

## 5. MOT

**Step:** 2 and 5
**MOT:** Client may show eligibility, but SOM remains authoritative at submission.
**Emotion:** Unknown.
**Fix:** Proposed: revalidate immediately before confirmation and explain `409` eligibility changes.

## 6. Pain Points & Insights

| Step | Pain Point                          | Insight / Hypothesis                                                 |
| ---- | ----------------------------------- | -------------------------------------------------------------------- |
| 2    | Eligibility changes after page load | Time-sensitive state                                                 |
| 5    | `404`/`409` terminal result         | Hypothesis: generic error would obscure why cancellation unavailable |
| 6    | State not refreshed                 | Could falsely imply cancellation failed/succeeded                    |

## 7. Stakeholder Notes

Inputs: Shopper Orders, SOM, Fulfillment, Payments/refunds, Account UX, Support.

Changes: User-test conflict messaging; instrument eligibility-to-submit drift.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: accepted cancellations ÷ cancellation submissions; conflict rate secondary.
**Top Improvements:** Pre-submit revalidation; authoritative conflict messaging.

---

# CUJ 17 — Return Eligible OMS-Managed Items

## 1. User Persona

**Name:** Order-Return Customer
**Segment Type:** Registered customer with return-eligible fulfilled item
**Goal Summary:** Initiate valid return for selected item quantity.
**Motivation:** Send eligible purchased item back through supported return process.
**Pain Points:** Quantity eligibility changes; invalid reason/product; SOM conflict.
**Expectations:** UI exposes only eligible quantities and records accepted return accurately.

## 2. JTBD

**When** an item from my order is eligible to return, **I want to** select the item, quantity, and required reason, **so I can** initiate the return.

## 3. CUJ Goal

**Successfully submit return for eligible OMS-managed item quantity.**

## 4. Critical Tasks

| Step | Task                         | Touchpoint             | Metric                          | Emotion |
| ---- | ---------------------------- | ---------------------- | ------------------------------- | ------- |
| 1    | Open eligible OMS order      | Account / Order Detail | Proposed: eligible-order reach  | Unknown |
| 2    | Start return/select items    | Return UI              | Proposed: return-start rate     | Unknown |
| 3    | Choose valid quantity/reason | Return modal           | Proposed: valid-selection rate  | Unknown |
| 4    | Review/submit return         | Return modal           | Proposed: submission rate       | Unknown |
| 5    | SOM validates/creates return | Shopper Orders / SOM   | Proposed: return acceptance     | Unknown |
| 6    | View refreshed return state  | Order Detail           | Proposed: state-refresh success | Unknown |

## 5. MOT

**Step:** 3–5
**MOT:** Return eligibility/quantity can differ between displayed client state and authoritative SOM state at submission.
**Emotion:** Unknown.
**Fix:** Proposed: live/pre-submit eligibility revalidation plus specific errors.

## 6. Pain Points & Insights

| Step | Pain Point                                             | Insight / Hypothesis                             |
| ---- | ------------------------------------------------------ | ------------------------------------------------ |
| 3    | Requested quantity exceeds current returnable quantity | Known `ReturnQuantityExceeded` domain            |
| 3    | Invalid reason code                                    | Known `InvalidReasonCode` domain                 |
| 5    | Product item IDs invalid                               | Known `UnknownProductItemIds` domain             |
| 5    | `409` state conflict                                   | Hypothesis: server state changed after UI loaded |
| 5    | Network/server failure                                 | Retry needed without losing selections           |

## 7. Stakeholder Notes

Inputs: Shopper Orders, SOM, Returns Operations, Refund/PSP downstream owners, UX, Support.

Changes: Preserve selections on retry; display specific authoritative rejection reason.

## 8. CUJ Summary

**Type:** Unverified.
**Metric Tied To Success:** Proposed: accepted returns ÷ return submissions; rejection-by-reason secondary.
**Top Improvements:** Pre-submit eligibility validation; specific recoverable error handling.

Repository documents explicit SOM return errors and downstream refund boundary.