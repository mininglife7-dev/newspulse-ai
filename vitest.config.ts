import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  // Use the automatic JSX runtime so component tests need no explicit React import.
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    // Node by default; component tests opt into jsdom via a per-file
    // `// @vitest-environment jsdom` pragma.
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    clearMocks: true,
  },
});
