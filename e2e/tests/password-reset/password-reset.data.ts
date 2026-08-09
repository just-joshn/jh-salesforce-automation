export interface PasswordResetRequest {
  readonly email: string;
}

export const passwordResetRequest: PasswordResetRequest = Object.freeze({
  email: 'cuj13-password-reset@example.com',
});

export const resetLandingPath = '/reset-password-landing';
