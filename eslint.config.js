import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    files: ['**/*.ts'],
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.test.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // No deep imports into @flusk packages — barrel imports only
      'no-restricted-imports': ['error', {
        patterns: [
          '@flusk/entities/*',
          '@flusk/types/*',
          '@flusk/business-logic/*',
          '@flusk/resources/*',
        ],
      }],

      // Max file length: 100 lines
      'max-lines': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],

      // No default exports
      'no-restricted-syntax': ['error', {
        selector: 'ExportDefaultDeclaration',
        message: 'Prefer named exports for consistency.',
      }],

      // No explicit any — warn level
      '@typescript-eslint/no-explicit-any': 'warn',

      // Require return types on exported functions
      '@typescript-eslint/explicit-module-boundary-types': 'warn',

      // No unused variables
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  {
    // Relaxed rules for test files
    files: ['**/*.test.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'max-lines': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    // Relaxed rules for CLI templates/generators (they generate code, can be longer)
    files: ['packages/cli/**/*.ts'],
    rules: {
      'max-lines': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      'no-restricted-imports': 'off', // Templates contain string literals, not real imports
    },
  },
];
