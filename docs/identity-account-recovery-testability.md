# CUJ-IDENTITY-003 — account recovery (password reset) testability

**Verdict: cannot be tested reliably against the public demo** (`pwa-kit.mobify-storefront.com`,
`RefArchGlobal`, guest access only, no admin console, config, or credentials). Documented with
evidence, following the rule "implement only if it can be tested reliably." The other two identity
journeys are fully covered: create-account (`*/tests/register`) and sign-in (`*/tests/signin`).

## Why not

- **The demo's login client does not allow the reset-request API.**
  `POST /customer/shopper-customers/v1/organizations/{org}/customers/password/actions/create-reset-token`
  returns **401 "Unauthorized request"** for every credential tried: the guest token, no auth at
  all, and even a registered shopper's token. So the reset request itself cannot be exercised at
  the API layer (and we also cannot check that it hides whether an email address exists).
- **Finishing a reset needs the email.** The success criterion — set a new password, the old one
  stops working, the new one signs in — requires the reset token that arrives **by email**, plus
  opening the configured landing page with it. That needs a mailbox the test controls (e.g.
  Mailosaur or MailSlurp) on an account you own, which a public-demo guest does not have.
- The storefront's `/reset-password` page renders, but submitting it is blocked the same way, and
  no token can ever be retrieved to finish the reset.

## What would make it testable

An environment you own where the reset endpoint is allowed on the login client, a test shopper's
email is a mailbox you control (or a fixed-token bypass is configured), and the reset landing page
is wired up. Then the whole journey — request the reset, open the emailed link, set a new password,
sign in with it — becomes a reliable end-to-end test.

## Where the surrounding identity logic IS covered

- `api/tests/register` + `e2e/tests/register` — account creation (SLAS + Shopper Customers).
- `api/tests/signin` + `e2e/tests/signin` — password sign-in, the session belongs to the right
  shopper, wrong credentials are rejected, and the guest cart merges into the account (browser).
