export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface Customer {
  customerId?: string;
  customerNo?: string;
  login?: string;
  email?: string;
}

export interface Fault {
  type?: string;
}

export const password = 'Test1234!';

// unique per run, so each execution registers exactly one new account
export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

// the test store rejects example.com, so this address is reliably invalid
export const invalidEmail = 'qa.portfolio.invalid@example.com';

export const registrant = (email: string): RegistrationInput => ({
  firstName: 'Test',
  lastName: 'Portfolio',
  email,
  password,
});
