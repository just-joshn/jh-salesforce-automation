import type { APIResponse } from '@playwright/test';
import type { ZodType } from 'zod';

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
  return result.data as T;
}
