import { NextResponse } from 'next/server';
import { getPageContent, savePageContent, DEFAULT_ASSAGGIA_CONTENT } from '@/lib/data/pages';

/**
 * GET /api/admin/pages?slug=...
 * Fetch content for a specific page slug.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  // Define default based on slug
  let defaultData: any = {};
  if (slug === 'assaggia-e-passeggia') {
    defaultData = DEFAULT_ASSAGGIA_CONTENT;
  }

  try {
    const data = await getPageContent(slug, defaultData);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/pages
 * Body: { slug, content }
 * Save content for a specific page.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, content } = body;

    if (!slug || !content) {
      return NextResponse.json({ error: 'Missing slug or content' }, { status: 400 });
    }

    const success = await savePageContent(slug, content);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Database update failed' }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
