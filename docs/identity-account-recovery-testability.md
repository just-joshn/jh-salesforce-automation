# CUJ-IDENTITY-003 — account recovery (password reset) testability

**Verdict: not reliably automatable against the public demo** (`pwa-kit.mobify-storefront.com`,
`RefArchGlobal`, guest-only, no admin/config/credentials). Documented with evidence, per the rule
"implement only if it can be tested reliably." The other two identity CUJs are fully covered:
create-account (`*/tests/register`) and sign-in (`*/tests/signin`).

## Why

- **The reset-request API is not permitted on this demo's SLAS client.**
  `POST /customer/shopper-customers/v1/organizations/{org}/customers/password/actions/create-reset-token`
  returns **401 "Unauthorized request"** for every credential tried — the guest SLAS token, no auth,
  and even a registered-customer token. So the reset request itself cannot be exercised at the API
  layer (nor its anti-enumeration behaviour asserted).
- **Completion is email-gated.** Even where the request succeeds, the flow's success criterion
  ("set a new password, old credentials stop working, sign in with the new password") requires the
  **reset token delivered by email** and opening the configured landing route with it. That needs a
  controllable mailbox (e.g. Mailosaur / MailSlurp) tied to an account whose email you own — which a
  public-demo guest does not have. See the sources in
  `checkout-express-and-one-click-testability.md` (§ Email OTP) — the same mailbox-ownership
  constraint applies.
- The storefront `/reset-password` page renders, but submitting a request is gated the same way, and
  no token can be retrieved to complete the reset.

## What would enable it

An environment you own where: the reset endpoint is permitted on the SLAS client, a registered test
shopper's email is a controllable mailbox (or a static-token bypass is configured), and the reset
landing route is wired. Then the full recover-access journey — request → tokenised link → new
password → sign in — becomes a reliable end-to-end test.

## Where the surrounding identity logic IS covered

- `api/tests/register` + `e2e/tests/register` — account creation (SLAS + Shopper Customers).
- `api/tests/signin` + `e2e/tests/signin` — password authentication, correct-shopper session,
  incorrect-credentials rejection, and guest→customer basket merge (browser).
