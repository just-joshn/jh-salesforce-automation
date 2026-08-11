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
