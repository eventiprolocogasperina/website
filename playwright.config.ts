// Test end-to-end del checkout (prompt 13). Usano un database locale separato (proloco_e2e), un secondo
// proxy Neon su :4455 e il simulatore di Nexi: niente servizi veri, niente database del sito (§18).
//   docker compose -f dev/docker-compose.yml up -d --build
//   npm run test:e2e
import { defineConfig, devices } from '@playwright/test';

const PORT = 3210;
import { E2E_DB, E2E_MAC_KEY } from './e2e/db';

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, locale: 'it-IT', timezoneId: 'Europe/Rome', trace: 'retain-on-failure', ...devices['Pixel 7'] },
  webServer: [
    {
      // Proxy Neon verso il database e2e (stessa immagine di dev/docker-compose.yml).
      command:
        'docker rm -f proloco-e2e-proxy >/dev/null 2>&1; docker run --rm --name proloco-e2e-proxy --network proloco-dev_default -e PG_CONNECTION_STRING=postgres://postgres:postgres@postgres:5432/proloco_e2e -p 4455:4444 proloco-dev-neon-proxy',
      port: 4455,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: `npx next dev -p ${PORT}`,
      url: `http://localhost:${PORT}/acquista/esito-non-valido`,
      reuseExistingServer: true,
      timeout: 240_000,
      env: {
        LOCAL_DB: '1',
        LOCAL_DB_PORT: '4455',
        POSTGRES_URL: E2E_DB,
        NEXT_PUBLIC_BASE_URL: `http://localhost:${PORT}`,
        NEXI_MODE: 'simulatore',
        NEXI_ALIAS: 'SIMULATORE',
        NEXI_MAC_KEY: E2E_MAC_KEY,
        EMAIL_DEV_OUTBOX: '1',
        RESEND_API_KEY: '',
        TELEGRAM_BOT_TOKEN: '',
        NUOVO_CHECKOUT: '1',
        NODE_OPTIONS: '--max-old-space-size=3072',
      },
    },
  ],
});
