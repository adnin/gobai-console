module.exports = {
  extends: ['@nkzw/eslint-config', 'plugin:@typescript-eslint/recommended'],
  overrides: [
    {
      files: ['src/tests/**/*.{ts,tsx}'],
      rules: { 'import-x/no-extraneous-dependencies': 'off' },
    },
  ],
  rules: {
    // --- productivity relaxations ---
    '@nkzw/no-instanceof': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-restricted-imports': 'off',
    'no-console': 'error',
    'react-hooks/refs': 'error',
    'react-hooks/set-state-in-effect': 'warn',
    // Sorting/curly perfectionist cleanup → fixable automatically
    curly: 'off',
    'perfectionist/sort-jsx-props': 'off',
    'perfectionist/sort-object-types': 'off',
    'perfectionist/sort-objects': 'off',
  },
};
