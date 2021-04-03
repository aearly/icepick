module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  env: { node: true, es2020: true },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    'prettier/prettier': 2,
  },
}
