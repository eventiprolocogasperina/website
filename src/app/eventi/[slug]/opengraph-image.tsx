import { eventOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/server/seo/og-image';

export const alt = 'Evento della Pro Loco Gasperina';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = 'force-dynamic';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return eventOgImage((await params).slug);
}
