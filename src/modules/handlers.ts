import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { editions } from '@/server/db/schema';
import { on, type DomainEvent, type DomainEventType } from '@/server/domain/events';
import { getModule, moduleSettings } from './registry';
import type { ModuleKey } from './types';
import { postponementHandlers } from './postponement/handlers';

// Collega gli handler dei moduli agli eventi di dominio (§6, §7). Ogni handler parte solo se il suo
// modulo è attivo per l'edizione dell'evento, e riceve le impostazioni già validate.
// Lo importano i servizi che pubblicano eventi; la registrazione avviene una volta sola.

type EditionInfo = { id: string; slug: string; title: string; enabledModules: string[]; moduleSettings: Record<string, unknown> };
export type ModuleHandler<T extends DomainEventType> = (event: Extract<DomainEvent, { type: T }>, ctx: { edition: EditionInfo; settings: Record<string, unknown> }) => Promise<void>;
export type ModuleHandlers = { [T in DomainEventType]?: ModuleHandler<T> };

/** Moduli attivi di un'edizione, letti dal database. */
export async function getEnabledModules(editionId: string): Promise<ModuleKey[]> {
  const [row] = await getDb().select({ m: editions.enabledModules }).from(editions).where(eq(editions.id, editionId));
  return (row?.m ?? []).filter((k): k is ModuleKey => !!getModule(k));
}

async function editionBySlug(slug: string): Promise<EditionInfo | null> {
  const [row] = await getDb()
    .select({ id: editions.id, slug: editions.slug, title: editions.title, enabledModules: editions.enabledModules, moduleSettings: editions.moduleSettings })
    .from(editions)
    .where(eq(editions.slug, slug));
  return row ?? null;
}

export function registerModuleHandlers(key: ModuleKey, handlers: ModuleHandlers): void {
  for (const [type, handler] of Object.entries(handlers) as Array<[DomainEventType, ModuleHandler<DomainEventType>]>) {
    on(type, async (event) => {
      if (!('edition' in event)) return;
      const edition = await editionBySlug(event.edition);
      if (!edition?.enabledModules.includes(key)) return;
      await handler(event as never, { edition, settings: moduleSettings(key, edition.moduleSettings) });
    });
  }
}

const g = globalThis as { __moduleHandlers?: boolean };
if (!g.__moduleHandlers) {
  g.__moduleHandlers = true;
  registerModuleHandlers('postponement', postponementHandlers);
}
