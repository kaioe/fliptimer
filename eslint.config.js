import js from '@eslint/js';
import globals from 'globals';

export default [
  // Ignore patterns
  {
    ignores: ['dist/', 'node_modules/', 'scripts/', '**/*.html'],
  },

  // Recommended rules + custom config
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.jquery,
      },
    },
    rules: {
      // Recommended
      ...js.configs.recommended.rules,

      // Custom overrides
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
      'eqeqeq': 'warn',
      'no-throw-literal': 'error',
      'no-redeclare': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'warn',
      'no-unreachable': 'error',
      'semi': ['error', 'always'],
      'no-extra-semi': 'error',
      'no-fallthrough': ['warn', { commentPattern: 'break omitted' }],
    },
  },
];
