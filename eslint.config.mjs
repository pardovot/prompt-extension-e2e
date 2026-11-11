import eslint from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    'playwright-report/',
    'test-results/',
    '.extension-unpacked/',
    '.profiles/',
    '.local/',
  ]),
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['src/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      // Assertions live in page object methods, which this rule cannot see from a spec.
      'playwright/expect-expect': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.setup.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              importNames: ['test', 'expect'],
              message: 'Import test and expect from the fixtures folder.',
            },
          ],
        },
      ],
    },
  },
);
