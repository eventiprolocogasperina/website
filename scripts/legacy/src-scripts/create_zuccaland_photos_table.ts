import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS zuccaland_photos (
        id SERIAL PRIMARY KEY,
        cloudinary_public_id VARCHAR(255) NOT NULL,
        frame_name VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tabella zuccaland_photos creata con successo!");
  } catch (error) {
    console.error("Errore nella creazione della tabella:", error);
  } finally {
    await pool.end();
  }
}

createTable();
