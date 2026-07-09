import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Scope tests to the GLO genome for now; the rest of the app is UI-only.
    include: ['lib/glo/__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
