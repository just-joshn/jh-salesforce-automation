import { expect, type Locator, type Page } from '@playwright/test';
import { expectSignedIn, openPath } from '../site';

export interface RegistrationDetails {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export class RegisterPage {
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly createAccount: Locator;

  constructor(private readonly page: Page) {
    this.firstName = page.getByRole('textbox', { name: 'First Name' });
    this.lastName = page.getByRole('textbox', { name: 'Last Name' });
    this.email = page.getByRole('textbox', { name: 'Email', exact: true });
    this.password = page.getByRole('textbox', { name: 'Password' });
    this.createAccount = page.getByRole('button', { name: 'Create Account' });
  }

  async goto(): Promise<void> {
    await openPath(this.page, '/registration');
  }

  async submit(details: RegistrationDetails): Promise<void> {
    await this.firstName.fill(details.firstName);
    await this.lastName.fill(details.lastName);
    await this.email.fill(details.email);
    await this.password.fill(details.password);
    await this.createAccount.click();
  }

  async register(details: RegistrationDetails): Promise<void> {
    await this.goto();
    await this.submit(details);
  }

  async expectRejected(): Promise<void> {
    await expect(this.page.getByRole('alert')).toBeVisible();
    await expect(this.firstName).toBeVisible();
  }

  async expectAccountCreated(): Promise<void> {
    await expect(this.page).toHaveURL(/\/account$/);
    await expect(this.page.getByRole('heading', { name: 'My Account', level: 1 })).toBeVisible();
    await expectSignedIn(this.page);
    await expect(this.page.getByRole('button', { name: 'Log Out' })).toBeVisible();
  }
}
