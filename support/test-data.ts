export const PRODUCT_FACTS = {
  hoopEarring: { id: '25720033M', name: 'Turquoise and Gold Hoop Earring', color: 'Gold' },
  silkTie: { id: '25752235M', name: 'Checked Silk Tie', color: 'Cobalt' },
} as const;

export const EMAIL_DOMAINS = {
  accepted: 'outlook.com',
  rejected: 'example.com',
} as const;

export const ADDRESS_FACTS = {
  primary: { firstName: 'Test', lastName: 'Shopper', phone: '4155550142', address: '1 Market Street', city: 'San Francisco', stateCode: 'CA', stateName: 'California', zip: '94105' },
  secondary: { firstName: 'Second', lastName: 'Address', phone: '6175550111', address: '2 Atlantic Avenue', city: 'Boston', stateCode: 'MA', stateName: 'Massachusetts', zip: '02108' },
  pickupBilling: { firstName: 'Test', lastName: 'Pickup', phone: '4155550142', address: '151 3rd St', city: 'San Francisco', stateCode: 'CA', stateName: 'California', zip: '94103' },
} as const;

export const PAYMENT_FACTS = {
  visa: { number: '4111111111111111', name: 'Test Shopper', expirationMonth: 12, expirationYear: 2030, cvv: '123' },
} as const;

export const STORE_FACTS = {
  locatorPostalCode: '94103',
  nearest: 'San Francisco Retail Store',
  inRange: 'San Mateo Retail Store',
  outOfRange: 'Palo Alto Retail Store',
} as const;
