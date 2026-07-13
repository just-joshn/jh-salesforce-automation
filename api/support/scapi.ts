import { env, scapiBaseUrl } from '../../config/env';

// Build a SCAPI resource URL: family + org id + resource, e.g.
//   shopperApiUrl('product/shopper-products/v1', 'products/25752235M')
export function shopperApiUrl(family: string, resource: string): string {
  return `${scapiBaseUrl()}/${family}/organizations/${env.scapi.organizationId}/${resource}`;
}

// Nearly every SCAPI call needs siteId, so attach it by default.
export function withSite(params: Record<string, string> = {}): Record<string, string> {
  return { siteId: env.scapi.siteId, ...params };
}

// Bearer auth header; works with guest or registered tokens.
export function bearer(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}
