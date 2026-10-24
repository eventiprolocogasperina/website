import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  const sql = neon(process.env.POSTGRES_URL);

  try {
    console.log('Creating reviews table...');
    await sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "eventId" VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        rating INTEGER NOT NULL,
        comment TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Reviews table created.');

    console.log('Adding thankYouEmailSent to orders table...');
    try {
      await sql`
        ALTER TABLE orders ADD COLUMN "thankYouEmailSent" BOOLEAN DEFAULT FALSE;
      `;
      console.log('Column added.');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('Column already exists.');
      } else {
        throw e;
      }
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

main();
