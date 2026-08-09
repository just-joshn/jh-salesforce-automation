import { randomUUID } from 'node:crypto';

import type { OrderableVariant } from '../../../api/support/products';

export interface GuestBasketProduct {
  readonly productId: string;
  readonly productName: string;
}

export interface PasswordlessLoginRequest {
  readonly email: string;
}

export interface PasswordlessToken {
  readonly value: string;
}

export const toGuestBasketProduct = (variant: OrderableVariant): GuestBasketProduct => ({
  productId: variant.productId,
  productName: variant.productName,
});

export const createPasswordlessLoginRequest = (): PasswordlessLoginRequest => ({
  email: `cuj11-${randomUUID().replaceAll('-', '')}@mailinator.com`,
});

export const toPasswordlessToken = (value: string): PasswordlessToken => ({ value });

export const externalTokenSkipReason = (
  mode: string | undefined,
  tokenLength: number | undefined,
  landingPath: string | undefined,
): string =>
  `Skipped: one-time token is delivered to an external mailbox this suite cannot read (mode: ${String(mode)}, tokenLength: ${String(tokenLength)}, landingPath: ${String(landingPath)}).`;
