import { expect, type Page } from '@playwright/test';
import { openPath } from '../site';

export interface RegistrationDetails {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export class RegisterPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await openPath(this.page, '/registration');
  }

  /** B1: fills and submits the create-account form. Assumes /registration is already open. */
  async submit(details: RegistrationDetails): Promise<void> {
    await this.page.getByRole('textbox', { name: 'First Name' }).fill(details.firstName);
    await this.page.getByRole('textbox', { name: 'Last Name' }).fill(details.lastName);
    await this.page.getByRole('textbox', { name: 'Email', exact: true }).fill(details.email);
    await this.page.getByRole('textbox', { name: 'Password' }).fill(details.password);
    await this.page.getByRole('button', { name: 'Create Account' }).click();
  }

  /** B1: navigates to /registration and submits the form in one step. */
  async register(details: RegistrationDetails): Promise<void> {
    await this.goto();
    await this.submit(details);
  }

  /** An email the platform rejects keeps the shopper on this same form with an inline error. */
  async expectRejected(): Promise<void> {
    await expect(this.page.getByRole('alert')).toBeVisible();
    await expect(this.page.getByRole('textbox', { name: 'First Name' })).toBeVisible();
  }

  async expectAccountCreated(): Promise<void> {
    await expect(this.page).toHaveURL(/\/account$/);
    await expect(this.page.getByRole('heading', { name: 'My Account', level: 1 })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Log Out' })).toBeVisible();
  }
}
