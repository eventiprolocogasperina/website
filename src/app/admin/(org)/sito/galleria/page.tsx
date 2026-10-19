import { pageDenied } from '@/server/auth/guard';
import LegacyPage from '@/components/admin/legacy/GalleryPage';

export const metadata = { title: 'Galleria' };

export default async function Page() {
  const denied = await pageDenied('content.edit');
  if (denied) return denied;
  return <LegacyPage />;
}
