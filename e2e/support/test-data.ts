import { test } from '@playwright/test';

export const PRODUCTS = {
  hoopEarring: {
    id: '25720033M',
    name: 'Turquoise and Gold Hoop Earring',
    color: 'Gold',
    unitPrice: '$30.00',
  },
  silkTie: {
    id: '25752235M',
    name: 'Checked Silk Tie',
    color: 'Cobalt',
  },
} as const;

export const ACCEPTED_EMAIL_DOMAIN = 'outlook.com';
export const REJECTED_EMAIL_DOMAIN = 'example.com';

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
  firstName: 'Test',
  lastName: 'Shopper',
  phone: '4155550142',
  address: '1 Market Street',
  city: 'San Francisco',
  state: 'California',
  zip: '94105',
};

export const SECONDARY_ADDRESS: AddressInput = {
  firstName: 'Second',
  lastName: 'Address',
  phone: '6175550111',
  address: '2 Atlantic Avenue',
  city: 'Boston',
  state: 'Massachusetts',
  zip: '02108',
};

/** Billing address for BOPIS checkout (E2), where there is no shipping address to copy. */
export const PICKUP_BILLING_ADDRESS: AddressInput = {
  firstName: 'Test',
  lastName: 'Pickup',
  phone: '4155550142',
  address: '151 3rd St',
  city: 'San Francisco',
  state: 'California',
  zip: '94103',
};

export interface CreditCardInput {
  number: string;
  name: string;
  expiration: string;
  cvv: string;
}

export const TEST_VISA: CreditCardInput = {
  number: '4111111111111111',
  name: 'Test Shopper',
  expiration: '12/30',
  cvv: '123',
};

export const STORE_LOCATOR_ZIP = '94103';

// Results are always distance-sorted by the store-search API (nearest first), so a
// fixed index is a stable, reliable way to target a row whose own radio input carries
// no accessible name (see components/store-locator-dialog.component.ts).
export const STORES = {
  nearest: { name: 'San Francisco Retail Store', index: 0 },
  inRange: { name: 'San Mateo Retail Store', index: 1 },
  outOfRange: { name: 'Palo Alto Retail Store', index: 2 },
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
