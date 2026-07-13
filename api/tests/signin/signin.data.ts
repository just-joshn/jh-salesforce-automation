export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface Customer {
  customerId?: string;
  login?: string;
}

export const password = 'Test1234!';
export const wrongPassword = 'WrongPass999!';

export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

export const registrant = (email: string): RegistrationInput => ({
  firstName: 'Test',
  lastName: 'Portfolio',
  email,
  password,
});
