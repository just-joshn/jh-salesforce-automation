export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export const password = 'Test1234!';

// New email every run.
export const uniqueEmail = (): string =>
  `qa.portfolio.${Date.now()}${Math.floor(Math.random() * 100000)}@gmail.com`;

// example.com emails are always invalid here.
export const invalidEmail = 'qa.portfolio.invalid@example.com';

// Reusing an email fails with this fault.
export const duplicateLoginFaultType = 'login-already-in-use';

export const registrant = (email: string): RegistrationInput => ({
  firstName: 'Test',
  lastName: 'Portfolio',
  email,
  password,
});
