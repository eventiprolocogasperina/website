import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  try {
    const sql = neon(process.env.POSTGRES_URL!);
    const news = await sql`SELECT * FROM news ORDER BY "publishedAt" DESC`;
    return NextResponse.json(news);
  } catch (error: any) {
    console.error('Failed to get news:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const sql = neon(process.env.POSTGRES_URL!);
    
    // Minimal validation
    if (!data.id || !data.slug || !data.title || !data.content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO news (id, slug, title, "coverImage", content, "publishedAt", author, featured, config)
      VALUES (${data.id}, ${data.slug}, ${data.title}, ${data.coverImage || null}, ${data.content}, ${data.publishedAt || new Date().toISOString()}, ${data.author || null}, ${data.featured || false}, ${data.config ? JSON.stringify(data.config) : null})
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('Failed to create news:', error);
    return NextResponse.json({ error: error.message || 'Failed to create news' }, { status: 500 });
  }
}
