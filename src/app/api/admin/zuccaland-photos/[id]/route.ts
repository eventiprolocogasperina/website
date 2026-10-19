import { NextResponse } from 'next/server';
import { updatePhotoStatus } from '@/lib/data/zuccaland_photos';
import { requirePermission } from '@/server/auth/context';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission('photos.moderate');
  if (denied) return denied;
  try {
    const { status } = await request.json();
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    
    if (isNaN(id) || !['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const updatedPhoto = await updatePhotoStatus(id, status);
    return NextResponse.json(updatedPhoto);
  } catch (error) {
    console.error('Error updating photo status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
