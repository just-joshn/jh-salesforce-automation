import { env, scapiBaseUrl } from '../../config/env';

// Build a shop API URL.
export function shopperApiUrl(family: string, resource: string): string {
  return `${scapiBaseUrl()}/${family}/organizations/${env.scapi.organizationId}/${resource}`;
}

// Add siteId to every shop API call.
export function withSite(params: Record<string, string> = {}): Record<string, string> {
  return { siteId: env.scapi.siteId, ...params };
}

// Auth header for guest or signed-in token.
export function bearer(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

// SCAPI marks nearly every response field optional, so values a 200 always
// carries still arrive as `T | undefined`. Fail naming the field.
export function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) throw new Error(`SCAPI response is missing ${field}`);
  return value;
}
