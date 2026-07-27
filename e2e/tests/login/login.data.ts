import { env } from '../../../config/env';

export interface LoginCredentials {
  email: string;
  password: string;
}

// Login from env (shared by setup + tests).
export function credentialsFromEnv(): LoginCredentials {
  return { email: env.account.email, password: env.account.password };
}
