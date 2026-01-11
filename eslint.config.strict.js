import base from './eslint.config.js';

// Strict ruleset (CI / release hardening)
//
// Usage:
//   yarn lint:strict
//
// Keep the default `yarn lint` usable during rapid UI work,
// then progressively move files from warnings -> clean -> strict.

export default [
  ...base,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 2,
      '@typescript-eslint/no-require-imports': 2,
      'no-console': 2,
      'perfectionist/sort-jsx-props': 2,
      'perfectionist/sort-object-types': 2,
      'perfectionist/sort-objects': 2,
      'react-hooks/refs': 2,
      'react-hooks/set-state-in-effect': 2,
      '@typescript-eslint/no-restricted-imports': 2,
      '@nkzw/no-instanceof': 2,
      'import-x/no-namespace': 2,
    },
  },

  // Pragmatic strict-mode overrides:
  // - Keeps hooks + runtime correctness strict
  // - Allows incremental typing cleanup in screens without blocking builds
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/ui/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@nkzw/no-instanceof': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

];
