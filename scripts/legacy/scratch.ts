import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.POSTGRES_URL as string);
  console.log('Running migration...');
  try {
    await sql`ALTER TABLE orders ADD COLUMN "deletedAt" TIMESTAMP DEFAULT NULL;`;
    console.log('Migration successful.');
  } catch (err: any) {
    if (err.message.includes('already exists')) {
      console.log('Column already exists.');
    } else {
      console.error('Migration failed:', err);
    }
  }
}

main();
