export interface PasswordResetRequest {
  readonly email: string;
}

export interface PasswordReset {
  readonly newPassword: string;
}

export const passwordResetRequest: PasswordResetRequest = Object.freeze({
  email: 'cuj13-password-reset@example.com',
});

export const passwordReset: PasswordReset = Object.freeze({
  newPassword: 'Cuj13NewPass123!',
});

export const resetLandingPath = '/reset-password-landing';
