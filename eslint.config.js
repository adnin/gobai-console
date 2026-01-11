import nkzw from '@nkzw/eslint-config';
import fbtee from '@nkzw/eslint-plugin-fbtee';

export default [
  ...nkzw,
  fbtee.configs.strict,
  {
    ignores: [
      '__generated__',
      '.expo',
      'android/',
      'dist/',
      'ios/',
      'vite.config.ts.timestamp-*',
    ],
  },
  {
    files: ['scripts/**/*.tsx'],
    rules: {
      'no-console': 0,
    },
  },
  {
    files: ['metro.config.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 0,
    },
  },
  {
    plugins: {
      '@nkzw/fbtee': fbtee,
    },
    rules: {
      '@nkzw/fbtee/no-untranslated-strings': 0,
      '@typescript-eslint/array-type': [2, { default: 'generic' }],

      // --- Local pragmatism: keep the codebase moving while we migrate UI ---
      // These are valuable rules, but turning them on immediately can create
      // thousands of errors on an existing codebase. We keep them as warnings
      // by default, and provide a strict config (`eslint.config.strict.js`) for CI.
      // Curly braces are a style preference; keep as warning so lint doesn't fail on legacy one-liners.
      curly: 1,

      '@typescript-eslint/no-explicit-any': 1,
      'no-console': 1,

      // Sorting rules are great once a codebase is stable; during active refactors
      // they create excessive noise.
      'perfectionist/sort-jsx-props': 0,
      'perfectionist/sort-object-types': 0,
      'perfectionist/sort-objects': 0,

      // Some React hooks rules are too strict for RN/Reanimated patterns.
      'react-hooks/immutability': 0,
      'react-hooks/refs': 1,
      'react-hooks/set-state-in-effect': 1,

      // Keep lint signal without blocking builds during migration.
      'no-empty': 1,
      'unicorn/prefer-number-properties': 1,

      // This project is ESM-first; keep require imports as warnings for now.
      '@typescript-eslint/no-require-imports': 1,

      // We still want to notice these, but not block day-to-day development.
      '@nkzw/no-instanceof': 1,
      'import-x/no-namespace': 1,
      '@typescript-eslint/no-restricted-imports': [
        1,
        {
          paths: [
            {
              importNames: ['Text'],
              message:
                'Please use the corresponding UI components from `src/ui/` instead.',
              name: 'react-native',
            },
            {
              importNames: ['ScrollView'],
              message:
                'Please use the corresponding UI component from `react-native-gesture-handler` instead.',
              name: 'react-native',
            },
            {
              importNames: ['BottomSheetModal'],
              message:
                'Please use the corresponding UI components from `src/ui/` instead.',
              name: '@gorhom/bottom-sheet',
            },
          ],
        },
      ],
      'import-x/no-extraneous-dependencies': [
        2,
        {
          devDependencies: [
            './eslint.config.js',
            './eslint.config.strict.js',
            './scripts/**.tsx',
            './tailwind.config.ts',
            './vitest.config.js',
            '**/*.test.tsx',
            '**/*.test.ts',
          ],
        },
      ],
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
  },
];
