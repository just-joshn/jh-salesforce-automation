export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// New email every run.
export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

export const registrant = (email: string): RegistrationInput => ({
  firstName: 'Test',
  lastName: 'Portfolio',
  email,
  password: 'Test1234!',
});

// A completed registration lands on the account landing route.
export const accountUrlPattern = /\/account\/?$/;
