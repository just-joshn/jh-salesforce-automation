import { einsteinActivityPath } from '../../support/einstein';
import { shopperApiUrl } from '../../support/scapi';
import { env } from '../../../config/env';

const AUTH = 'shopper/auth/v1';

export const token = (): string => shopperApiUrl(AUTH, 'oauth2/token');

export const einsteinActivity = (activity: string): string =>
  `${env.einstein.host}${einsteinActivityPath(activity)}`;
