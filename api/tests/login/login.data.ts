import { env } from '../../../config/env';

export interface LoginCredentials {
  email: string;
  password: string;
}

export const credentialsFromEnv = (): LoginCredentials => ({
  email: env.account.email,
  password: env.account.password,
});

export const missingCredentialsReason = (): string =>
  'No shopper credentials configured; running guest-only.';
