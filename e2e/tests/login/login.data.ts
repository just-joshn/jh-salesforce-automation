import { env } from '../../../config/env';

export interface LoginCredentials {
  email: string;
  password: string;
}

// Reads the shopper account from env; kept here so the specs and the login setup share one source.
export function credentialsFromEnv(): LoginCredentials {
  return { email: env.account.email, password: env.account.password };
}
