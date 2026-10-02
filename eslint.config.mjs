import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts']),
  {
    rules: {
      // Money, percentages and quantities are formatted from strings; never coerce with a bare Number(...) for display math.
      'no-restricted-globals': ['error', { name: 'parseFloat', message: 'Money and percentages are strings; use lib/format.' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
    },
  },
]);
