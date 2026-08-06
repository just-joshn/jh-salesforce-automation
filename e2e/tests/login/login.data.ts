import { env, hasAccountCredentials } from '../../../config/env';

export interface LoginCredentials {
  email: string;
  password: string;
}

// Login from env (shared by setup + tests).
export const credentialsFromEnv = (): LoginCredentials => ({
  email: env.account.email,
  password: env.account.password,
});

// Guest-only runs have no shopper account, so the sign-in journey opts out.
export const credentialsAvailable = (): boolean => hasAccountCredentials();
