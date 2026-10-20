'use server';

import { revalidateTag } from 'next/cache';
import { runAction } from '@/server/admin/run-action';
import { NAV_CACHE_TAG, saveNavigation, setPublicV2 } from '@/server/domain/site/navigation';
import type { NavConfigInput } from '@/lib/public/nav';

// Il layout pubblico legge il menu dalla cache (tag public-nav): dopo ogni modifica si aggiorna subito.
const PATHS = ['/admin/sito/navigazione', '/', '/eventi'];

export async function saveNavigationAction(input: NavConfigInput) {
  const res = await runAction(PATHS, (ctx) => saveNavigation(ctx, input));
  if (res.ok) revalidateTag(NAV_CACHE_TAG, 'max');
  return res;
}

export async function setPublicV2Action(enabled: boolean) {
  const res = await runAction(PATHS, (ctx) => setPublicV2(ctx, enabled));
  if (res.ok) revalidateTag(NAV_CACHE_TAG, 'max');
  return res;
}
