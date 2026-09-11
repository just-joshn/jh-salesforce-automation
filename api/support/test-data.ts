import { randomUUID } from 'node:crypto';
import { ADDRESS_FACTS, EMAIL_DOMAINS, PAYMENT_FACTS, PRODUCT_FACTS, STORE_FACTS } from '../../support/test-data';

/**
 * Mirrors e2e/support/test-data.ts exactly (same products, addresses, card, stores) so
 * the two suites exercise the same catalog/address/payment data — plus the resolved
 * *variant* SKUs each master product needs for a basket, confirmed live: SCAPI rejects a
 * master productId on `POST .../baskets/{id}/items` with "Invalid Product Type", so a
 * basket-bound call needs the concrete orderable variant, never the master id itself.
 */
export const PRODUCTS = {
  hoopEarring: {
    ...PRODUCT_FACTS.hoopEarring,
    variantId: '013742002799M',
    unitPrice: 30,
  },
  silkTie: {
    ...PRODUCT_FACTS.silkTie,
    variantId: '682875090845M',
  },
} as const;

export const ACCEPTED_EMAIL_DOMAIN = EMAIL_DOMAINS.accepted;
export const REJECTED_EMAIL_DOMAIN = EMAIL_DOMAINS.rejected;

export const VALID_PASSWORD = process.env.API_TEST_PASSWORD ?? 'CujAutomationApi!2026';
export const ALTERNATE_PASSWORD =
  process.env.API_TEST_PASSWORD_ALTERNATE ?? 'CujAutomationApi!2027';

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
  ...ADDRESS_FACTS.primary,
};

export const SECONDARY_ADDRESS: AddressInput = {
  ...ADDRESS_FACTS.secondary,
};

/** Billing address for BOPIS checkout (E2), where there is no shipping address to copy. */
export const PICKUP_BILLING_ADDRESS: AddressInput = {
  ...ADDRESS_FACTS.pickupBilling,
};

export interface CreditCardInput {
  number: string;
  name: string;
  expirationMonth: number;
  expirationYear: number;
  cvv: string;
}

export const TEST_VISA: CreditCardInput = {
  ...PAYMENT_FACTS.visa,
};

export const STORE_LOCATOR_ZIP = STORE_FACTS.locatorPostalCode;
export const STORE_LOCATOR_GEO = { latitude: '37.7749', longitude: '-122.4194' } as const;

// Distance-sorted by the store-search API itself (nearest first) — same stable ordering
// e2e/support/test-data.ts relies on for the UI's unnamed radio rows.
export const STORES = {
  nearest: { name: STORE_FACTS.nearest, inventoryId: 'inventory_m_store_store1' },
  inRange: { name: STORE_FACTS.inRange },
  outOfRange: { name: STORE_FACTS.outOfRange },
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
