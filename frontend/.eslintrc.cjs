module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'react', '@typescript-eslint'],
  settings: { react: { version: 'detect' } },
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // Desactivar validación ARIA de axe para expresiones dinámicas JSX
    'axe/aria': 'off',
    'axe/name-role-value': 'off',
    'axe/forms': 'off',
    // Cambiar inline styles a warning en lugar de error
    'no-inline-styles': 'warn',
  }
}
