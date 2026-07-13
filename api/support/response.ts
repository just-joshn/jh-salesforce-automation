import type { APIResponse } from '@playwright/test';
import type { ZodType } from 'zod';

/**
 * Parses a successful API body at the HTTP boundary. Generated OpenAPI types describe
 * what TypeScript expects; this check proves the live response has the fields the test
 * relies on before it is cast to that generated type.
 */
export async function parseJson<T>(
  response: APIResponse,
  schema: ZodType,
  operation: string,
): Promise<T> {
  const contentType = response.headers()['content-type'] ?? '';
  if (!/application\/(?:problem\+)?json/i.test(contentType)) {
    throw new Error(
      `${operation} response content type must be JSON, received: ${contentType || '<missing>'}`,
    );
  }

  const payload: unknown = await response.json();
  const result = schema.safeParse(payload);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new Error(`${operation} response contract failed: ${details}`);
  }
  // The schema is intentionally focused on fields this workflow reads, while T is the
  // generated full response type. Runtime validation happens above; this is the typed
  // handoff between the focused contract and the generated OpenAPI surface.
  return result.data as T;
}
