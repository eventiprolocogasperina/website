'use server';

import type { Block } from '@/components/public/blocks/schema';
import { runAction } from '@/server/admin/run-action';
import { saveSeriesBlocks, setPublicV2 } from '@/server/domain/pages';

/** Salva i blocchi della pagina fuori stagione del format. */
export async function saveSeriesPageAction(slug: string, blocks: Block[], version: string) {
  return runAction(['/admin'], (ctx) => saveSeriesBlocks(ctx, slug, blocks, version));
}

/** Interruttore `public_v2`: /zuccaland e /assaggia-e-passeggia passano alle pagine a blocchi. */
export async function setPublicV2Action(enabled: boolean) {
  return runAction(['/admin', '/zuccaland', '/assaggia-e-passeggia'], (ctx) => setPublicV2(ctx, enabled));
}
