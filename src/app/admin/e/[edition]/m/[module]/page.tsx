import { notFound } from 'next/navigation';
import ReviewsPage from '@/components/admin/legacy/ReviewsPage';
import { ActivitiesPage } from '@/components/admin/modules/ActivitiesPage';
import { PostponementPage } from '@/components/admin/modules/PostponementPage';
import ZuccalandInvitesPage from '@/components/admin/legacy/ZuccalandInvitesPage';
import ZuccalandPhotosPage from '@/components/admin/legacy/ZuccalandPhotosPage';
import { MODULE_LABELS, MODULE_PERMISSIONS } from '@/components/admin/shell/nav.config';
import { pageDenied } from '@/server/auth/guard';
import { getEdition } from '@/server/domain/editions';
import type { EditionModule } from '@/server/domain/editions/types';

type Props = { params: Promise<{ edition: string; module: string }> };

const PAGES: Partial<Record<EditionModule, (edition: string) => React.ReactNode>> = {
  activities: (edition) => <ActivitiesPage edition={edition} />,
  postponement: (edition) => <PostponementPage edition={edition} />,
  invites: () => <ZuccalandInvitesPage />,
  'visitor-photos': () => <ZuccalandPhotosPage />,
  reviews: () => <ReviewsPage />,
};

async function resolve({ params }: Props) {
  const { edition: slug, module } = await params;
  const edition = await getEdition(slug);
  if (!edition || !edition.modules.includes(module as EditionModule) || !PAGES[module as EditionModule]) notFound();
  return module as EditionModule;
}

export async function generateMetadata(props: Props) {
  return { title: MODULE_LABELS[await resolve(props)] };
}

/** Moduli attivabili per edizione (§10.2). Solo quelli accesi per l'edizione esistono. */
export default async function EditionModulePage(props: Props) {
  const mod = await resolve(props);
  const { edition } = await props.params;
  const denied = await pageDenied(MODULE_PERMISSIONS[mod], { edition });
  if (denied) return denied;
  return PAGES[mod]!(edition);
}
