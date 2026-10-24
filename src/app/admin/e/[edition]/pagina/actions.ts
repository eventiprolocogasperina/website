'use server';

import type { Block } from '@/components/public/blocks/schema';
import { runAction } from '@/server/admin/run-action';
import { saveEditionBlocks } from '@/server/domain/pages';

/** Salva i blocchi della pagina dell'edizione: permessi, edizione archiviata e zod li controlla il servizio. */
export async function saveEditionPageAction(slug: string, blocks: Block[], version: string) {
  return runAction(['/admin'], (ctx) => saveEditionBlocks(ctx, slug, blocks, version));
}
