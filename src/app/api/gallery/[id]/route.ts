import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  if (!process.env.POSTGRES_URL) throw new Error('Missing POSTGRES_URL');
  return neon(process.env.POSTGRES_URL);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = getDb();
    const body = await request.json();
    const { src, alt, category, width, height } = body;

    const result = await sql`
      UPDATE gallery
      SET
        src      = COALESCE(${src}, src),
        alt      = COALESCE(${alt}, alt),
        category = COALESCE(${category}, category),
        width    = COALESCE(${width}, width),
        height   = COALESCE(${height}, height)
      WHERE id = ${id}
      RETURNING *;
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }
    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('PUT /api/gallery/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = getDb();

    const result = await sql`DELETE FROM gallery WHERE id = ${id} RETURNING id;`;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/gallery/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
