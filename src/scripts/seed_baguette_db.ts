import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function seed() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  const sql = neon(process.env.POSTGRES_URL);

  const jsonPath = path.join(process.cwd(), 'src', 'lib', 'data', 'baguette-2026-gallery.json');
  const galleryPhotos = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Found ${galleryPhotos.length} photos in JSON.`);

  let inserted = 0;
  for (const photo of galleryPhotos) {
    // Generate unique ID using crypto random UUID or hash of the full path
    const hash = crypto.createHash('md5').update(photo.src).digest('hex').substring(0, 16);
    const id = `b26_${hash}`;
    try {
      await sql`
        INSERT INTO gallery (id, src, alt, category, width, height)
        VALUES (${id}, ${photo.src}, 'Foto Baguette da Record 2026', 'baguette26', ${photo.width}, ${photo.height})
        ON CONFLICT (id) DO NOTHING;
      `;
      inserted++;
    } catch (err) {
      console.error('Failed to insert', photo.src, err);
    }
  }

  console.log(`Done! Inserted ${inserted} photos.`);
}
seed().catch(console.error);
