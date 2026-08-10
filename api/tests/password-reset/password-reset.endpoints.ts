import { shopperApiUrl, slasUrl } from '../../support/scapi';

export const customers = (): string => shopperApiUrl('customer/shopper-customers', 'customers');

// Answers 401 to a SLAS shopper token; needs Account Manager sfcc.shopper-customers.login. That is
// why the CUJ 13 gate demands those credentials: callback mode POSTs the token to a registered
// callback this suite cannot host, so minting it here is how the journey reaches step 4.
export const resetToken = (): string =>
  shopperApiUrl('customer/shopper-customers', 'customers/password/actions/create-reset-token');

// auth.yaml:1529. Live-verified: rejects an unregistered callback_uri with 400.
export const passwordReset = (): string => slasUrl('oauth2/password/reset');

// auth.yaml:1672.
export const passwordAction = (): string => slasUrl('oauth2/password/action');
