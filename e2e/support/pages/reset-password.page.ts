import { expect, type Page } from '@playwright/test';

/** The "Reset Password" screen reached from LoginPage.goToForgotPassword(). */
export class ResetPasswordPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
  }

  async requestReset(email: string): Promise<void> {
    await this.page
      .getByRole('main')
      .getByRole('textbox', { name: 'Email', exact: true })
      .fill(email);
    await this.page.getByRole('button', { name: 'Reset Password' }).click();
  }

  /** The platform's anti-enumeration confirmation copy when the reset service accepts the request. */
  async expectConfirmation(): Promise<void> {
    await expect(this.page.getByText(/you will receive an email/i)).toBeVisible();
  }

  /** Staging masks its missing sender-email configuration behind a generic alert. */
  async expectServiceError(): Promise<void> {
    await expect(this.page.getByRole('alert')).toContainText('Something went wrong');
  }
}
