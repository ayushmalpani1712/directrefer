import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Build artifacts and vendored/minified files are never linted.
  { ignores: ['dist', 'node_modules', 'app', 'public/**', '**/*.min.*', 'src/data/mock.ts', 'src/lib/supabase.ts', 'src/declarations.d.ts', 'playwright-report', 'test-results', 'blob-report', 'playwright/.cache'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ---- App source (React + TS) ----
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        process: 'readonly',
        Buffer: 'readonly',
        chrome: 'readonly',
        console: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Classic React Hook rules that catch real bugs are enforced.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // The react-hooks v7 plugin adds many strict, opinionated rules that fire on
      // this legacy codebase's established data-loading patterns. Disable them so
      // lint stays useful without a risky mass refactor.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off', // TypeScript already checks identifiers; globals above cover browser/Node.
    },
  },

  // ---- E2E (Playwright fixtures are not React components) ----
  {
    files: ['e2e/**/*.{ts,tsx}', 'playwright/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },

  // ---- Config files (Node / CJS) ----
  {
    files: ['*.config.js', '*.config.ts', 'eslint.config.js', 'api/**/*.js', 'api/**/*.mjs', 'scripts/**/*.js', 'scripts/**/*.mjs', 'check-env.mjs', 'chrome-extension/**/*.js', 'reseed*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
    },
  },
)