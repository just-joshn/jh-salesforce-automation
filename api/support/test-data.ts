import { randomUUID } from 'node:crypto';

/**
 * Mirrors e2e/support/test-data.ts exactly (same products, addresses, card, stores) so
 * the two suites exercise the same catalog/address/payment data — plus the resolved
 * *variant* SKUs each master product needs for a basket, confirmed live: SCAPI rejects a
 * master productId on `POST .../baskets/{id}/items` with "Invalid Product Type", so a
 * basket-bound call needs the concrete orderable variant, never the master id itself.
 */
export const PRODUCTS = {
  hoopEarring: {
    id: '25720033M',
    variantId: '013742002799M',
    name: 'Turquoise and Gold Hoop Earring',
    color: 'Gold',
    unitPrice: 30,
  },
  silkTie: {
    id: '25752235M',
    variantId: '682875090845M',
    name: 'Checked Silk Tie',
    color: 'Cobalt',
  },
} as const;

export const ACCEPTED_EMAIL_DOMAIN = 'outlook.com';
export const REJECTED_EMAIL_DOMAIN = 'example.com';

export const VALID_PASSWORD = 'CujAutomationApi!2026';
export const ALTERNATE_PASSWORD = 'CujAutomationApi!2027';

export interface AddressInput {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  stateCode: string;
  zip: string;
}

export const PRIMARY_ADDRESS: AddressInput = {
  firstName: 'Test',
  lastName: 'Shopper',
  phone: '4155550142',
  address: '1 Market Street',
  city: 'San Francisco',
  stateCode: 'CA',
  zip: '94105',
};

export const SECONDARY_ADDRESS: AddressInput = {
  firstName: 'Second',
  lastName: 'Address',
  phone: '6175550111',
  address: '2 Atlantic Avenue',
  city: 'Boston',
  stateCode: 'MA',
  zip: '02108',
};

/** Billing address for BOPIS checkout (E2), where there is no shipping address to copy. */
export const PICKUP_BILLING_ADDRESS: AddressInput = {
  firstName: 'Test',
  lastName: 'Pickup',
  phone: '4155550142',
  address: '151 3rd St',
  city: 'San Francisco',
  stateCode: 'CA',
  zip: '94103',
};

export interface CreditCardInput {
  number: string;
  name: string;
  expirationMonth: number;
  expirationYear: number;
  cvv: string;
}

export const TEST_VISA: CreditCardInput = {
  number: '4111111111111111',
  name: 'Test Shopper',
  expirationMonth: 12,
  expirationYear: 2030,
  cvv: '123',
};

export const STORE_LOCATOR_ZIP = '94103';
export const STORE_LOCATOR_GEO = { latitude: '37.7749', longitude: '-122.4194' } as const;

// Distance-sorted by the store-search API itself (nearest first) — same stable ordering
// e2e/support/test-data.ts relies on for the UI's unnamed radio rows.
export const STORES = {
  nearest: { name: 'San Francisco Retail Store', inventoryId: 'inventory_m_store_store1' },
  inRange: { name: 'San Mateo Retail Store' },
  outOfRange: { name: 'Palo Alto Retail Store' },
} as const;

/**
 * Builds a stamp that is unique within and across parallel runs. The optional worker index
 * keeps worker-created accounts easy to identify; UUID entropy prevents cross-shard clashes.
 */
function uniqueStamp(workerIndex?: number): string {
  return `${workerIndex ?? 'test'}-${Date.now()}-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

/** A short-lived, unique email on a domain the platform accepts. */
export function uniqueEmail(prefix: string, workerIndex?: number): string {
  return `cuj-api-${prefix}-${uniqueStamp(workerIndex)}@${ACCEPTED_EMAIL_DOMAIN}`;
}

/** A unique email on a domain the platform's validation is known to reject. */
export function rejectedEmail(prefix: string): string {
  return `cuj-api-${prefix}-${uniqueStamp()}@${REJECTED_EMAIL_DOMAIN}`;
}
