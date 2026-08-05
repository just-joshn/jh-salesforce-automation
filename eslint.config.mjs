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
      // Vendored SCAPI specs and the types generated from them. Machine output;
      // regenerate with `pnpm gen:api:fetch && pnpm gen:api` instead of editing.
      'api/specs',
      'api/generated',
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
