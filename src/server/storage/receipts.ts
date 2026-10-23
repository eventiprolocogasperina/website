import 'server-only';
import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';

// Ricevute dei costi su Cloudinary come asset `authenticated`: non hanno un URL pubblico. Si caricano
// e si leggono solo dal server, firmando con il segreto (mai NEXT_PUBLIC_*). Per vederle si passa da
// /api/admin/costi/[id]/ricevuta, che controlla il permesso, scrive nel registro e reindirizza a un
// link firmato che scade dopo pochi minuti.

import { RECEIPT_FOLDER, type ReceiptRef } from '@/lib/costs';

/** Durata del link firmato per aprire una ricevuta. */
const LINK_TTL_SECONDS = 5 * 60;

function configured() {
  const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key, CLOUDINARY_API_SECRET: api_secret } = process.env;
  if (!cloud_name || !api_key || !api_secret) throw new Error('Cloudinary non è configurato.');
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return cloudinary;
}

/** Carica una ricevuta (PDF o immagine) come asset privato. Il nome è casuale: il nome del file non esce mai. */
export async function uploadPrivateReceipt(file: Buffer, isPdf: boolean): Promise<ReceiptRef> {
  const c = configured();
  const result = await new Promise<{ public_id: string; format?: string }>((resolve, reject) => {
    c.uploader
      .upload_stream(
        {
          folder: RECEIPT_FOLDER,
          type: 'authenticated',
          // PDF come `raw` (la consegna dei PDF come immagine è spesso spenta sugli account): l'estensione resta nel public_id.
          resource_type: isPdf ? 'raw' : 'image',
          ...(isPdf ? { public_id: `${randomUUID()}.pdf` } : {}),
        },
        (error, res) => (error || !res ? reject(error ?? new Error('Caricamento non riuscito.')) : resolve(res)),
      )
      .end(file);
  });
  return { publicId: result.public_id, resourceType: isPdf ? 'raw' : 'image', format: isPdf ? null : (result.format ?? null) };
}

/** Link firmato e a scadenza per scaricare la ricevuta privata. */
export function signedReceiptUrl(ref: ReceiptRef, now = Date.now()): string {
  const c = configured();
  return c.utils.private_download_url(ref.publicId, ref.format ?? '', {
    resource_type: ref.resourceType,
    type: 'authenticated',
    expires_at: Math.floor(now / 1000) + LINK_TTL_SECONDS,
  });
}
