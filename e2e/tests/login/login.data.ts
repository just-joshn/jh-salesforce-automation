import { env, hasAccountCredentials } from '../../../config/env';

export interface LoginCredentials {
  email: string;
  password: string;
}

// Login from env (shared by setup + tests).
export function credentialsFromEnv(): LoginCredentials {
  return { email: env.account.email, password: env.account.password };
}

// Guest-only runs have no shopper account, so the sign-in journey opts out.
export function credentialsAvailable(): boolean {
  return hasAccountCredentials();
}
