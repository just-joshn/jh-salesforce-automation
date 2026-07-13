import { env } from '../../config/env';

// Prepend the site/locale prefix (/global/en-US) so specs can use bare paths:
//   buildPath('/product/25752235M') -> /global/en-US/product/25752235M
export function buildPath(path: string): string {
  const prefix = `/${env.siteAlias}/${env.locale}`;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${prefix}${suffix}`;
}
