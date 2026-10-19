import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { editionPermissions } from '@/server/auth/permissions';
import { getEdition } from '@/server/domain/editions';

/** Livello Edizione (§10.2): esiste solo per le edizioni conosciute. */
export default async function EditionLayout({ children, params }: { children: ReactNode; params: Promise<{ edition: string }> }) {
  const { edition } = await params;
  if (!(await getEdition(edition))) notFound();
  const ctx = await getAdminCtx();
  if (!ctx || editionPermissions(ctx, edition).length === 0) return pageDenied([], { edition });
  return children;
}
