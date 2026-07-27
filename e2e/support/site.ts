import { env } from '../../config/env';

// Add /global/en-US in front of paths.
export function buildPath(path: string): string {
  const prefix = `/${env.siteAlias}/${env.locale}`;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${prefix}${suffix}`;
}
