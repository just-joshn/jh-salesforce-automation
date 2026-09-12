import { randomUUID } from 'node:crypto';
import { ADDRESS_FACTS, EMAIL_DOMAINS, PAYMENT_FACTS, PRODUCT_FACTS, STORE_FACTS } from '../../support/test-data';

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

export const STORES = {
  nearest: { name: STORE_FACTS.nearest, inventoryId: 'inventory_m_store_store1' },
  inRange: { name: STORE_FACTS.inRange },
  outOfRange: { name: STORE_FACTS.outOfRange },
} as const;

function uniqueStamp(workerIndex?: number): string {
  return `${workerIndex ?? 'test'}-${Date.now()}-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export function uniqueEmail(prefix: string, workerIndex?: number): string {
  return `cuj-api-${prefix}-${uniqueStamp(workerIndex)}@${ACCEPTED_EMAIL_DOMAIN}`;
}

export function rejectedEmail(prefix: string): string {
  return `cuj-api-${prefix}-${uniqueStamp()}@${REJECTED_EMAIL_DOMAIN}`;
}
