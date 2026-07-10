import { defineConfig } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextCoreWebVitals,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      // react-hooks v6 rule that rejects the fetch-on-mount pattern used by
      // every data page (an effect calling an async loader that setStates).
      // Satisfying it means restructuring around a query library — an
      // architecture decision tracked in the Founder Brief, not a lint chore.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'],
  },
]);
