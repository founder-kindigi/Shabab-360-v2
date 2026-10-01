import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../../../src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['docs/reviews/v2-audit-2026-09-08/*.test.ts'],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 10000,
  },
});
