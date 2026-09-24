'use strict';

module.exports = {
  env: { node: true, es2022: true, jest: true },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: { ecmaVersion: 2022, sourceType: 'script' },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_|next' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};