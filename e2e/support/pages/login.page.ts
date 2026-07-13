import { expect, type Page } from '@playwright/test';
import { openPath } from '../site';
import { ResetPasswordPage } from './reset-password.page';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await openPath(this.page, '/login');
  }

  /** B2: signs in via the password tab (email -> "Password" tab -> password -> Sign In). */
  async loginWithPassword(email: string, password: string): Promise<void> {
    await this.goto();
    const form = this.page.getByTestId('sf-auth-modal-form');
    await form.getByRole('textbox', { name: 'Email' }).fill(email);
    await this.page.getByRole('button', { name: 'Password', exact: true }).click();
    await this.page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
    await this.page.getByRole('button', { name: 'Sign In', exact: true }).click();
  }

  async expectInvalidCredentialsError(): Promise<void> {
    await expect(this.page.getByRole('alert')).toContainText(/something went wrong/i);
  }

  /** B3: fills email and requests a one-time passwordless code via "Continue". */
  async requestPasswordlessCode(email: string): Promise<void> {
    await this.goto();
    const form = this.page.getByTestId('sf-auth-modal-form');
    await form.getByRole('textbox', { name: 'Email' }).fill(email);
    await this.page.getByRole('button', { name: 'Continue', exact: true }).click();
  }

  /**
   * B4: clicks a social-login button (Google / Apple). This is a real, useful navigation
   * to model (the IdP's own authorize flow), but the caller owns waiting for the resulting
   * response since the assertion is about that transition, not this page's own state.
   */
  async clickSocialLogin(idp: 'Google' | 'Apple'): Promise<void> {
    await this.goto();
    await this.page.getByRole('button', { name: idp }).click();
  }

  /**
   * B5: opens the "Forgot password?" flow from the password tab. Returns the resulting
   * page — a real, meaningful transition worth modeling, not just "navigation happened".
   */
  async goToForgotPassword(emailAttempt: string): Promise<ResetPasswordPage> {
    await this.goto();
    const form = this.page.getByTestId('sf-auth-modal-form');
    await form.getByRole('textbox', { name: 'Email' }).fill(emailAttempt);
    await this.page.getByRole('button', { name: 'Password', exact: true }).click();
    await this.page.getByRole('button', { name: 'Forgot password?' }).click();
    return new ResetPasswordPage(this.page);
  }
}
