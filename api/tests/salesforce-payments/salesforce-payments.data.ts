export interface ShopperConfiguration {
  readonly id: string;
  readonly value: unknown;
}

export interface ShopperConfigurationsResponse {
  readonly configurations: readonly ShopperConfiguration[];
}

export const expected = Object.freeze({
  salesforcePaymentsAllowedId: 'SalesforcePaymentsAllowed',
  successStatus: 200,
});

export const isEnabled = (value: unknown): boolean => value === true || value === 'true';
