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
      // Unawaited Playwright calls make tests pass or fail at random; flag them.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Plain JS/MJS config files sit outside the typed project; drop the type-aware rules here.
    files: ['**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
