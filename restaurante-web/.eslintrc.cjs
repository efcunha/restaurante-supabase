/* eslint-env node */
module.exports = {
  root: true,

  env: {
    es2021: true
  },

  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended'
  ],

rules: {
  // nunca quebram o build
  '@typescript-eslint/no-unused-vars': 'warn',
  '@typescript-eslint/no-explicit-any': 'warn',

  // quebram build se acontecer
  'no-debugger': 'error',
  'no-undef': 'error'
  }

}
