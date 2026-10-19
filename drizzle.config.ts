import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local', quiet: true });

// Migrazioni versionate in drizzle/. In locale POSTGRES_URL punta al database Docker di dev/;
// mai eseguire db:migrate contro la produzione senza il consenso di Niccolo (§18.4).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.POSTGRES_URL ?? '' },
  strict: true,
  verbose: true,
});
