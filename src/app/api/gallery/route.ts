import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

import { galleryItems } from '@/lib/data/gallery';

function getDb() {
  if (!process.env.POSTGRES_URL) throw new Error('Missing POSTGRES_URL');
  return neon(process.env.POSTGRES_URL);
}

export async function GET() {
  try {
    const sql = getDb();
    let rows = await sql`SELECT * FROM gallery ORDER BY "createdAt" DESC`;
    
    // Seed if empty
    if (rows.length === 0) {
      console.log('Gallery empty, seeding with static items...');
      for (const item of galleryItems) {
        await sql`
          INSERT INTO gallery (id, src, alt, category, width, height)
          VALUES (${item.id}, ${item.src}, ${item.alt}, ${item.category}, ${item.width}, ${item.height})
          ON CONFLICT (id) DO NOTHING;
        `;
      }
      rows = await sql`SELECT * FROM gallery ORDER BY "createdAt" DESC`;
    }
    
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('GET /api/gallery error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = getDb();
    const body = await request.json();
    const { src, alt, category, width, height } = body;

    if (!src || !alt || !category) {
      return NextResponse.json({ error: 'src, alt and category are required' }, { status: 400 });
    }

    const id = Date.now().toString();
    const result = await sql`
      INSERT INTO gallery (id, src, alt, category, width, height)
      VALUES (${id}, ${src}, ${alt}, ${category}, ${width || 1920}, ${height || 1080})
      RETURNING *;
    `;
    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('POST /api/gallery error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
