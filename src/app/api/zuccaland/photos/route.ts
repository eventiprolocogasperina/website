import { NextResponse } from 'next/server';
import { addPhoto, getPhotosByStatus } from '@/lib/data/zuccaland_photos';

export async function POST(request: Request) {
  try {
    const { publicId, frameName } = await request.json();
    
    if (!publicId || !frameName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const photo = await addPhoto(publicId, frameName);
    return NextResponse.json(photo);
  } catch (error) {
    console.error('Error saving photo:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const photos = await getPhotosByStatus('approved');
    return NextResponse.json(photos);
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
