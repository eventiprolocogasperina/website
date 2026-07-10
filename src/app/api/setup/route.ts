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
      await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS config JSONB DEFAULT NULL;`;
      await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS "isFree" BOOLEAN DEFAULT FALSE;`;
      await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS "dateLabel" VARCHAR(255);`;
      log.push('events columns updated');
    } catch (e: any) {
      log.push('events update note: ' + e.message);
    }
    
    // orders table updates
    try {
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;`;
      log.push('orders notes column updated');
    } catch (e: any) {
      log.push('orders update note: ' + e.message);
    }

    // 3. Bookings table
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id           VARCHAR(255) PRIMARY KEY,
        event_id     VARCHAR(255) NOT NULL,
        nome         VARCHAR(255) NOT NULL,
        cognome      VARCHAR(255) NOT NULL,
        email        VARCHAR(255) NOT NULL,
        telefono     VARCHAR(255),
        partecipanti INTEGER      NOT NULL DEFAULT 1,
        note         TEXT,
        stato        VARCHAR(50)  NOT NULL DEFAULT 'confermato',
        "createdAt"  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
        "checkedIn"  BOOLEAN      DEFAULT FALSE
      );
    `;
    log.push('bookings table: ok');

    // 4. News table
    await sql`
      CREATE TABLE IF NOT EXISTS news (
        id            VARCHAR(255) PRIMARY KEY,
        slug          VARCHAR(255) NOT NULL UNIQUE,
        title         VARCHAR(255) NOT NULL,
        "coverImage"  TEXT,
        content       TEXT         NOT NULL,
        "publishedAt" TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
        author        VARCHAR(255),
        featured      BOOLEAN      DEFAULT FALSE,
        config        JSONB        DEFAULT NULL
      );
    `;
    log.push('news table: ok');

    // 5. Orders table (for Ticketing & Nexi XPAY)
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id            VARCHAR(255) PRIMARY KEY,
        "buyerName"   VARCHAR(255) NOT NULL,
        "buyerEmail"  VARCHAR(255) NOT NULL,
        "totalAmount" DECIMAL(10,2) NOT NULL,
        status        VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
        "nexiMac"     VARCHAR(255),
        "createdAt"   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
        "paidAt"      TIMESTAMPTZ
      );
    `;
    log.push('orders table: ok');

    // 6. Tickets table
    await sql`
      CREATE TABLE IF NOT EXISTS tickets (
        id            VARCHAR(255) PRIMARY KEY,
        "orderId"     VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        "eventId"     VARCHAR(255) NOT NULL,
        type          VARCHAR(100) NOT NULL,
        price         DECIMAL(10,2) NOT NULL,
        "qrCodeData"  VARCHAR(255) NOT NULL UNIQUE,
        "isCheckedIn" BOOLEAN      DEFAULT FALSE,
        "checkInTime" TIMESTAMPTZ
      );
    `;
    log.push('tickets table: ok');

    // 7. Pages content table (for CMS)
    await sql`
      CREATE TABLE IF NOT EXISTS pages_content (
        slug          VARCHAR(255) PRIMARY KEY,
        content       JSONB        NOT NULL,
        "updatedAt"   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
      );
    `;
    log.push('pages_content table: ok');

    // 8. Discounts table
    await sql`
      CREATE TABLE IF NOT EXISTS discounts (
        id            VARCHAR(255) PRIMARY KEY,
        code          VARCHAR(255) NOT NULL UNIQUE,
        type          VARCHAR(50)  NOT NULL,
        value         DECIMAL(10,2) NOT NULL,
        max_uses      INTEGER      DEFAULT 0,
        current_uses  INTEGER      DEFAULT 0,
        expiry_date   TIMESTAMPTZ,
        active        BOOLEAN      DEFAULT TRUE,
        created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
        applies_to    VARCHAR(50)  DEFAULT 'ALL'
      );
    `;
    
    try {
      await sql`ALTER TABLE discounts ADD COLUMN IF NOT EXISTS applies_to VARCHAR(50) DEFAULT 'ALL';`;
      log.push('discounts table updated');
    } catch (e: any) {
      log.push('discounts update note: ' + e.message);
    }
    
    log.push('discounts table: ok');

    // 9. Sponsors table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS sponsors (
          id            VARCHAR(255) PRIMARY KEY,
          name          VARCHAR(255) NOT NULL,
          logo_url      TEXT         NOT NULL,
          website_url   TEXT,
          tier          VARCHAR(50)  NOT NULL DEFAULT 'bronze',
          active        BOOLEAN      DEFAULT TRUE,
          sort_order    INTEGER      DEFAULT 0,
          "createdAt"   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
        );
      `;
      log.push('sponsors table: ok');
    } catch (e: any) {
      log.push('sponsors table note: ' + e.message);
    }

    // 10. Site settings table (key/value pairs)
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS site_settings (
          key           VARCHAR(255) PRIMARY KEY,
          value         TEXT         NOT NULL,
          "updatedAt"   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
        );
      `;
      // Seed default settings if empty
      await sql`
        INSERT INTO site_settings (key, value)
        VALUES
          ('ticket_sales_enabled', 'true'),
          ('event_date', '2026-08-10'),
          ('contact_email', 'prolocogasperina@gmail.com'),
          ('social_instagram', 'https://www.instagram.com/prolocogasperina'),
          ('social_facebook', 'https://www.facebook.com/prolocogasperina')
        ON CONFLICT (key) DO NOTHING;
      `;
      log.push('site_settings table: ok');
    } catch (e: any) {
      log.push('site_settings table note: ' + e.message);
    }

    return NextResponse.json({ ok: true, log });
  } catch (error: any) {
    console.error('/api/setup error:', error);
    return NextResponse.json({ error: error.message, log }, { status: 500 });
  }
}
