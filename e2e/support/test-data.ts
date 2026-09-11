import { test } from '@playwright/test';
import { ADDRESS_FACTS, EMAIL_DOMAINS, PAYMENT_FACTS, PRODUCT_FACTS, STORE_FACTS } from '../../support/test-data';

export const PRODUCTS = {
  hoopEarring: { ...PRODUCT_FACTS.hoopEarring, unitPrice: '$30.00' },
  silkTie: { ...PRODUCT_FACTS.silkTie },
} as const;

export const ACCEPTED_EMAIL_DOMAIN = EMAIL_DOMAINS.accepted;
export const REJECTED_EMAIL_DOMAIN = EMAIL_DOMAINS.rejected;

export const VALID_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'CujAutomation!2026';
export const ALTERNATE_PASSWORD = process.env.E2E_TEST_PASSWORD_ALTERNATE ?? 'CujAutomation!2027';

export interface AddressInput {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export const PRIMARY_ADDRESS: AddressInput = {
  ...ADDRESS_FACTS.primary,
  state: ADDRESS_FACTS.primary.stateName,
};

export const SECONDARY_ADDRESS: AddressInput = {
  ...ADDRESS_FACTS.secondary,
  state: ADDRESS_FACTS.secondary.stateName,
};

/** Billing address for BOPIS checkout (E2), where there is no shipping address to copy. */
export const PICKUP_BILLING_ADDRESS: AddressInput = {
  ...ADDRESS_FACTS.pickupBilling,
  state: ADDRESS_FACTS.pickupBilling.stateName,
};

export interface CreditCardInput {
  number: string;
  name: string;
  expiration: string;
  cvv: string;
}

export const TEST_VISA: CreditCardInput = {
  number: PAYMENT_FACTS.visa.number,
  name: PAYMENT_FACTS.visa.name,
  expiration: `${PAYMENT_FACTS.visa.expirationMonth}/${String(PAYMENT_FACTS.visa.expirationYear).slice(-2)}`,
  cvv: PAYMENT_FACTS.visa.cvv,
};

export const STORE_LOCATOR_ZIP = STORE_FACTS.locatorPostalCode;

// Results are always distance-sorted by the store-search API (nearest first), so a
// fixed index is a stable, reliable way to target a row whose own radio input carries
// no accessible name (see components/store-locator-dialog.component.ts).
export const STORES = {
  nearest: { name: STORE_FACTS.nearest, index: 0 },
  inRange: { name: STORE_FACTS.inRange, index: 1 },
  outOfRange: { name: STORE_FACTS.outOfRange, index: 2 },
} as const;

/**
 * Builds a stamp that is unique both within a run (timestamp + random) and across
 * parallel workers (workerIndex) — the same worker-isolation identifier Playwright's own
 * fixture and parallelism docs use, e.g. `user-${workerInfo.workerIndex}`.
 */
function uniqueStamp(): string {
  const { workerIndex } = test.info();
  return `${workerIndex}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** A short-lived, unique email on a domain the platform accepts. */
export function uniqueEmail(prefix: string): string {
  return `cuj-${prefix}-${uniqueStamp()}@${ACCEPTED_EMAIL_DOMAIN}`;
}

/** A unique email on a domain the platform's validation is known to reject. */
export function rejectedEmail(prefix: string): string {
  return `cuj-${prefix}-${uniqueStamp()}@${REJECTED_EMAIL_DOMAIN}`;
}
