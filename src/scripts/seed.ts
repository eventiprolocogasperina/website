import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

const events: any[] = [];

dotenv.config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error('Missing POSTGRES_URL in .env.local');
    process.exit(1);
  }

  console.log('Connecting to Neon Database...');
  const sql = neon(connectionString);

  console.log('Creating events table...');
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id VARCHAR(255) PRIMARY KEY,
      slug VARCHAR(255) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      date VARCHAR(255) NOT NULL,
      "dateLabel" VARCHAR(255),
      time VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      "fullDescription" TEXT NOT NULL,
      image VARCHAR(255) NOT NULL,
      "maxParticipants" INTEGER NOT NULL,
      "registeredCount" INTEGER NOT NULL,
      price INTEGER NOT NULL,
      featured BOOLEAN NOT NULL,
      bookable BOOLEAN NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log('Table events created or already exists.');

  console.log(`Migrating ${events.length} events...`);
  for (const event of events) {
    // Check if event already exists
    const existing = await sql`SELECT id FROM events WHERE id = ${event.id}`;
    
    if (existing.length === 0) {
      await sql`
        INSERT INTO events (
          id, slug, title, date, "dateLabel", time, location, category, 
          description, "fullDescription", image, "maxParticipants", "registeredCount", 
          price, featured, bookable
        ) VALUES (
          ${event.id}, ${event.slug}, ${event.title}, ${event.date}, ${event.dateLabel || null}, ${event.time}, ${event.location}, ${event.category},
          ${event.description}, ${event.fullDescription}, ${event.image}, ${event.maxParticipants}, ${event.registeredCount},
          ${event.price}, ${event.featured}, ${event.bookable}
        );
      `;
      console.log(`Inserted event: ${event.title}`);
    } else {
      console.log(`Event already exists: ${event.title}`);
    }
  }

  console.log('Migration complete!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
