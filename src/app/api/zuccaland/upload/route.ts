import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { addPhoto } from '@/lib/data/zuccaland_photos';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/zuccaland/upload
 * Accetta: multipart/form-data con "file" (immagine) e "frameName"
 * Carica su Cloudinary via SDK (lato server, credenziali segrete)
 * Salva record in DB con status 'pending'
 * Restituisce: { success, publicId }
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const frameName = (formData.get('frameName') as string) || null; // null = nessuna cornice

    if (!file) {
      return NextResponse.json({ error: 'Nessun file allegato.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo immagini sono accettate.' }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'Il file non può superare 15 MB.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload firmato su Cloudinary tramite SDK server-side
    const uploadResult = await new Promise<{ public_id: string; secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'zuccaland-2026',
          resource_type: 'image',
          transformation: [
            { width: 1080, height: 1350, crop: 'limit' }, // Formato portrait 1080x1350
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload fallito'));
          resolve(result as { public_id: string; secure_url: string });
        }
      ).end(buffer);
    });

    // Salva in DB con status 'pending'
    const photo = await addPhoto(uploadResult.public_id, frameName);

    return NextResponse.json({ success: true, publicId: uploadResult.public_id, photoId: photo.id });
  } catch (err: any) {
    console.error('Zuccaland upload error:', err);
    return NextResponse.json({ error: err.message || 'Errore durante il caricamento.' }, { status: 500 });
  }
}
