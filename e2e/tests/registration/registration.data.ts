import { randomUUID } from 'node:crypto';

export interface RegistrationDetails {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly password: string;
}

export interface CustomerRegistrationRequest {
  readonly customer: {
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly login: string;
  };
  readonly password: string;
}

export const createRegistrationDetails = (): RegistrationDetails =>
  Object.freeze({
    email: `cuj9-${randomUUID()}@mailinator.com`,
    firstName: 'CUJ',
    lastName: 'Shopper',
    password: 'Passw0rd!2026',
  });

export const toInvalidRegistrationDetails = (
  details: RegistrationDetails,
): RegistrationDetails =>
  Object.freeze({
    ...details,
    firstName: '',
    lastName: '',
    password: 'weak',
  });

export const toCustomerRegistrationRequest = (
  details: RegistrationDetails,
): CustomerRegistrationRequest =>
  Object.freeze({
    customer: Object.freeze({
      email: details.email,
      firstName: details.firstName,
      lastName: details.lastName,
      login: details.email,
    }),
    password: details.password,
  });
