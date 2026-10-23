import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getAdminCtx } from '@/server/auth/context';
import { RECEIPT_FOLDER } from '@/lib/costs';
import { can, type Permission } from '@/server/auth/permissions';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/admin/upload
 * Accepts: multipart/form-data with a "file" field
 * Returns: { url, publicId }
 */
export async function POST(request: Request) {
  // Contenuti, edizioni e foto del materiale: file pubblici. Le ricevute dei costi sono private e
  // passano da /api/admin/costi/ricevuta.
  const ctx = await getAdminCtx();
  if (!ctx) return NextResponse.json({ error: 'Accedi per continuare.' }, { status: 401 });
  if (!(['content.edit', 'editions.edit', 'inventory.write'] as Permission[]).some((p) => can(ctx, p))) {
    return NextResponse.json({ error: 'Non hai i permessi per questa operazione.' }, { status: 403 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'pro-loco-gasperina';

    if (folder.startsWith(RECEIPT_FOLDER)) {
      return NextResponse.json({ error: 'Le ricevute dei costi si caricano dalla scheda del costo.' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: 'Nessun file allegato' }, { status: 400 });
    }

    // Convert File to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    // Upload to Cloudinary via stream
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const options: any = {
        folder,
        resource_type: isPdf ? 'raw' : 'auto',
      };
      
      if (isPdf) {
        options.public_id = file.name;
      }

      cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result as { secure_url: string; public_id: string });
        }
      ).end(buffer);
    });

    return NextResponse.json({ success: true, url: result.secure_url, publicId: result.public_id });
  } catch (err: any) {
    console.error('Cloudinary upload error:', err);
    return NextResponse.json({ error: err.message || 'Upload fallito' }, { status: 500 });
  }
}
