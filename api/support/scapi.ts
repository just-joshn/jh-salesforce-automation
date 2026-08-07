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

// SCAPI marks nearly every response field optional, so a value a 200 always
// carries still arrives as `T | undefined`. Throws naming the missing field.
export function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) throw new Error(`SCAPI response is missing ${field}`);
  return value;
}

// SCAPI allows any `c_`-prefixed custom attribute, so the spec types them as
// unknown. Checked at runtime, not asserted.
export function customString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
