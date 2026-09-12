import type { APIRequestContext } from '@playwright/test';
import { proxyApiUrl } from './env';

export abstract class ScapiClient {
  constructor(protected readonly request: APIRequestContext) {}

  protected apiUrl(family: string, resourcePath: string): string {
    const encodedPath = resourcePath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return proxyApiUrl(family, encodedPath);
  }

  protected authed(accessToken: string): Record<string, string> {
    return {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };
  }

  protected json(accessToken: string): Record<string, string> {
    return {
      ...this.authed(accessToken),
      'Content-Type': 'application/json',
    };
  }
}
