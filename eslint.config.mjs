// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      'playwright-report',
      'test-results',
      'blob-report',
      'playwright/.auth',
    ],
  },
  {
    files: ['**/*.{js,mjs,ts}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Catch missing await on Playwright calls.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      complexity: ['error', { max: 5, variant: 'classic' }],
      // 'sonarjs/cognitive-complexity': ['error', 10],
    },
  },
  {
    // JS config files: no TypeScript-only rules.
    files: ['**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
