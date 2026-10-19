import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      { resolve: { alias }, test: { name: 'unit', include: ['src/**/*.test.ts'], exclude: ['src/**/*.db.test.ts'] } },
      {
        resolve: { alias },
        // Test sul database: girano solo con TEST_DATABASE_URL (npm run test:db), un file alla volta (--no-file-parallelism nello script).
        test: { name: 'db', include: ['src/**/*.db.test.ts'], globalSetup: ['src/test/db-global-setup.ts'], setupFiles: ['src/test/db-setup.ts'], testTimeout: 20_000 },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/server/domain/**/*.ts'],
      exclude: ['src/server/domain/**/*.test.ts'],
      reporter: ['text-summary', 'text'],
    },
  },
});
