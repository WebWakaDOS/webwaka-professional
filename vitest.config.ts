import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Allow vitest to resolve bare ESM imports (no .js extension) from
    // @webwaka/core dist files, which use extensionless re-exports.
    extensions: ['.ts', '.js', '.mjs', '.cjs', '.json'],
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
