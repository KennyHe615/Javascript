import { defineConfig } from 'vitest/config';

export default defineConfig({
   test: {
      testTimeout: 10000, // Global timeout for all tests
      environment: 'node', // This is the default, but explicit is better
      globals: true,
      coverage: {
         provider: 'v8',
         reporter: ['text', 'html'],
         exclude: ['node_modules/', 'dist/', '**/*.config.js', '**/__tests__/**'],
      },
   },
});
