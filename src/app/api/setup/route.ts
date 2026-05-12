import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

/**
 * GET /api/setup
 *
 * Idempotent database setup endpoint.
 * - Creates the `gallery` table if it does not exist.
 * - Adds the `config` JSONB column to `events` if missing.
 *
 * Call once from the browser (or curl) after deploy:
 *   curl http://localhost:3000/api/setup
 */
export async function GET() {
  if (!process.env.POSTGRES_URL) {
    return NextResponse.json({ error: 'Missing POSTGRES_URL' }, { status: 500 });
  }

  const sql = neon(process.env.POSTGRES_URL);
  const log: string[] = [];

  try {
    // 1. Gallery table
    await sql`
      CREATE TABLE IF NOT EXISTS gallery (
        id          VARCHAR(255) PRIMARY KEY,
        src         TEXT        NOT NULL,
        alt         TEXT        NOT NULL,
        category    VARCHAR(50) NOT NULL DEFAULT 'territorio',
        width       INTEGER     NOT NULL DEFAULT 1920,
        height      INTEGER     NOT NULL DEFAULT 1080,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;
    log.push('gallery table: ok');

    // 2. config column on events
    try {
      await sql`ALTER TABLE events ADD COLUMN config JSONB DEFAULT NULL;`;
      log.push('events.config column: added');
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        log.push('events.config column: already exists');
      } else {
        throw e;
      }
    }

    return NextResponse.json({ ok: true, log });
  } catch (error: any) {
    console.error('/api/setup error:', error);
    return NextResponse.json({ error: error.message, log }, { status: 500 });
  }
}
