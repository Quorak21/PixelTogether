import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    teardownTimeout: 5_000,
    fileParallelism: false,
    pool: 'forks',
  },
});
