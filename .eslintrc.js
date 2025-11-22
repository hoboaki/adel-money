'use strict';

const OFF = 0;
const ERROR = 2;

module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:prettier/recommended',
    'prettier',
  ],
  plugins: ['simple-import-sort', '@typescript-eslint'],
  env: { node: true, es6: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.json',
  },
  settings: {
    react: {
      pragma: 'React',
      version: 'detect',
    },
  },
  rules: {
    'no-constant-condition': [OFF],
    quotes: [ERROR, 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    'simple-import-sort/imports': [ERROR],
    'simple-import-sort/exports': [ERROR],
    '@typescript-eslint/explicit-function-return-type': [OFF],
    '@typescript-eslint/interface-name-prefix': [OFF],
    '@typescript-eslint/no-use-before-define': [OFF],
    '@typescript-eslint/no-unused-vars': [
      ERROR,
      {
        vars: 'all',
        args: 'none',
        ignoreRestSiblings: false,
      },
    ],
  },
};
