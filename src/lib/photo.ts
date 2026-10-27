import type { ImageLoader } from 'next/image';

const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

// Le foto degli album stanno su Cloudinary (npm run foto): le ridimensiona Cloudinary, con formato e qualità
// automatici, e non l'ottimizzatore di Vercel, che sul piano gratuito ha un tetto mensile di immagini.
const cloudinaryLoader: ImageLoader = ({ src, width, quality }) => src.replace(CLOUDINARY, `$1f_auto,q_${quality ?? 'auto'},c_limit,w_${width}/$2`);

/** Props extra di next/image per una foto: il loader di Cloudinary se la foto è lì, niente altrimenti. */
export const photoLoader = (src: string): { loader?: ImageLoader } => (CLOUDINARY.test(src) ? { loader: cloudinaryLoader } : {});
