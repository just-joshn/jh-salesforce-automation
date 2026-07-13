export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// Unique per call so each run registers a fresh account.
export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

export const registrant = (email: string): RegistrationInput => ({
  firstName: 'Test',
  lastName: 'Portfolio',
  email,
  password: 'Test1234!',
});
