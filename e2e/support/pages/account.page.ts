import { expect, type Page, type Response } from '@playwright/test';
import { openPath } from '../site';

export class AccountPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await openPath(this.page, '/account');
  }

  async logout(): Promise<void> {
    await this.goto();
    await this.page.getByRole('button', { name: 'Log Out' }).click();
  }

  /**
   * Opens the inline editor for an /account card ("My Profile" or "Password") by finding
   * its heading and clicking the "Edit" button that is its sibling under the same card.
   */
  async openCardEditor(cardHeading: string): Promise<void> {
    const heading = this.page.getByRole('heading', { name: cardHeading, exact: true });
    await heading.locator('..').getByRole('button', { name: 'Edit' }).click();
  }

  /** B6: changes the signed-in shopper's password from the "Password" card. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.openCardEditor('Password');
    await this.page.getByRole('textbox', { name: 'Current Password' }).fill(currentPassword);
    await this.page.getByRole('textbox', { name: 'New Password', exact: true }).fill(newPassword);
    await this.page.getByRole('textbox', { name: 'Confirm New Password' }).fill(newPassword);
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  async expectPasswordUpdated(): Promise<void> {
    await expect(this.page.getByText('Password updated')).toBeVisible();
  }

  /** B7: updates the phone number on the "My Profile" card, returning the PATCH response. */
  async updatePhoneNumber(phone: string): Promise<Response> {
    await this.openCardEditor('My Profile');
    const patchResponse = this.page.waitForResponse(
      (res) => res.request().method() === 'PATCH' && res.url().includes('/customers/'),
    );
    await this.page.getByRole('textbox', { name: 'Phone Number' }).fill(phone);
    await this.page.getByRole('button', { name: 'Save' }).click();
    return patchResponse;
  }
}
