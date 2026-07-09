import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const sql = neon(process.env.POSTGRES_URL!);
    
    const result = await sql`
      UPDATE news
      SET
        title = ${data.title},
        slug = ${data.slug},
        "coverImage" = ${data.coverImage || null},
        content = ${data.content},
        author = ${data.author || null},
        featured = ${data.featured || false},
        config = ${data.config ? JSON.stringify(data.config) : null}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    console.error('Failed to update news:', error);
    return NextResponse.json({ error: error.message || 'Failed to update news' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sql = neon(process.env.POSTGRES_URL!);
    
    const result = await sql`
      DELETE FROM news WHERE id = ${id} RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete news:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete news' }, { status: 500 });
  }
}
