// Test end-to-end del checkout (prompt 13). Usano un database locale separato (proloco_e2e), un secondo
// proxy Neon su :4455 e il simulatore di Nexi: niente servizi veri, niente database del sito (§18).
//   docker compose -f dev/docker-compose.yml up -d --build
//   npm run test:e2e
import { defineConfig, devices } from '@playwright/test';

import { E2E_DB, E2E_DB_NAME, E2E_MAC_KEY } from './e2e/db';

// Porte e nome del proxy si possono cambiare per far girare i test di più worktree insieme
// (es. E2E_PORT=3266 E2E_PROXY_PORT=4466 E2E_DB_NAME=agentcheckout_e2e). Predefiniti: 3210, 4455.
const PORT = Number(process.env.E2E_PORT || 3210);
const PROXY_PORT = Number(process.env.E2E_PROXY_PORT || 4455);
const PROXY_NAME = PROXY_PORT === 4455 ? 'proloco-e2e-proxy' : `proloco-e2e-proxy-${PROXY_PORT}`;

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
        `docker rm -f ${PROXY_NAME} >/dev/null 2>&1; docker run --rm --name ${PROXY_NAME} --network proloco-dev_default -e PG_CONNECTION_STRING=postgres://postgres:postgres@postgres:5432/${E2E_DB_NAME} -p ${PROXY_PORT}:4444 proloco-dev-neon-proxy`,
      port: PROXY_PORT,
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
        LOCAL_DB_PORT: String(PROXY_PORT),
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
