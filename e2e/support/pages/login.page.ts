import { expect, type Locator, type Page } from '@playwright/test';
import { openPath } from '../site';

export class LoginPage {
  readonly email: Locator;
  readonly passwordTab: Locator;
  readonly password: Locator;
  readonly signIn: Locator;
  readonly continueButton: Locator;
  readonly forgotPassword: Locator;

  constructor(private readonly page: Page) {
    this.email = page.getByRole('textbox', { name: 'Email', exact: true });
    this.passwordTab = page.getByRole('button', { name: 'Password', exact: true });
    this.password = page.getByRole('textbox', { name: 'Password', exact: true });
    this.signIn = page.getByRole('button', { name: 'Sign In', exact: true });
    this.continueButton = page.getByRole('button', { name: 'Continue', exact: true });
    this.forgotPassword = page.getByRole('button', { name: 'Forgot password?' });
  }

  async goto(): Promise<void> {
    await openPath(this.page, '/login');
  }

  private async openWithEmail(email: string): Promise<void> {
    await this.goto();
    await this.email.fill(email);
  }

  async loginWithPassword(email: string, password: string): Promise<void> {
    await this.openWithEmail(email);
    await this.passwordTab.click();
    await this.password.fill(password);
    await this.signIn.click();
  }

  async expectInvalidCredentialsError(): Promise<void> {
    await expect(this.page.getByRole('alert')).toContainText(/something went wrong/i);
  }

  async requestPasswordlessCode(email: string): Promise<void> {
    await this.openWithEmail(email);
    await this.continueButton.click();
  }

  async clickSocialLogin(idp: 'Google' | 'Apple'): Promise<void> {
    await this.goto();
    await this.page.getByRole('button', { name: idp }).click();
  }

  async goToForgotPassword(emailAttempt: string): Promise<void> {
    await this.openWithEmail(emailAttempt);
    await this.passwordTab.click();
    await this.forgotPassword.click();
  }
}
