import type { Page } from '@playwright/test';

export const container = (page: Page) => page.getByTestId('login-page');
export const email = (page: Page) => page.getByLabel('Email');
export const password = (page: Page) => page.getByLabel('Password');
export const submit = (page: Page) => page.getByRole('button', { name: 'Sign In' });
