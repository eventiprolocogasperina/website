import 'server-only';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { dependents, getModule, isModuleKey, MODULES, moduleSettings } from '@/modules/registry';
import { settingsFields, type SettingsField } from '@/modules/settings-form';
import type { ModuleKey } from '@/modules/types';
import type { Ctx } from '@/server/auth/context-shared';
import { withTransaction } from '@/server/db/client';
import { editions } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { assertCan, editionForWrite } from './index';

// Interruttori e impostazioni dei moduli di un'edizione (§7). Spegnere un modulo non cancella
// niente: dati e impostazioni restano e tornano com'erano quando lo si riaccende.

export type ModuleView = {
  key: ModuleKey;
  name: string;
  description: string;
  enabled: boolean;
  dependsOn: Array<{ key: ModuleKey; name: string }>;
  fields: SettingsField[];
  settings: Record<string, unknown>;
};

export function describeEditionModules(e: { enabledModules: string[]; moduleSettings: Record<string, unknown> | null }): ModuleView[] {
  return MODULES.map((m) => ({
    key: m.key,
    name: m.name,
    description: m.description,
    enabled: e.enabledModules.includes(m.key),
    dependsOn: (m.dependsOn ?? []).map((d) => ({ key: d, name: getModule(d)!.name })),
    fields: settingsFields(m),
    settings: moduleSettings(m.key, e.moduleSettings),
  }));
}

const ModuleKeyInput = z.string().refine(isModuleKey, 'Modulo sconosciuto.');

export async function setModuleEnabled(ctx: Ctx, slug: string, input: { module: string; enabled: boolean }): Promise<void> {
  assertCan(ctx, 'modules.manage', slug);
  const key = ModuleKeyInput.parse(input.module) as ModuleKey;
  const enabled = z.boolean().parse(input.enabled);
  const m = getModule(key)!;
  await withTransaction(async (tx) => {
    const e = await editionForWrite(tx, slug);
    const current = e.enabledModules;
    if (current.includes(key) === enabled) return;
    if (enabled) {
      const missing = (m.dependsOn ?? []).filter((d) => !current.includes(d));
      if (missing.length) throw new DomainError('CONFLICT', { message: `Attiva prima: ${missing.map((d) => getModule(d)!.name).join(', ')}.` });
    } else {
      const needed = dependents(key, current);
      if (needed.length) throw new DomainError('CONFLICT', { message: `Serve a: ${needed.map((d) => d.name).join(', ')}. Spegni prima quelli.` });
    }
    const next = enabled ? [...current, key] : current.filter((k) => k !== key);
    await tx.update(editions).set({ enabledModules: next, updatedAt: new Date() }).where(eq(editions.id, e.id));
    await audit(tx, ctx, enabled ? 'edition.module_enabled' : 'edition.module_disabled', { entityType: 'edition', entityId: e.id, edition: slug, after: { module: key } });
  });
}

export async function saveModuleSettings(ctx: Ctx, slug: string, input: { module: string; settings: unknown }): Promise<void> {
  assertCan(ctx, 'modules.manage', slug);
  const key = ModuleKeyInput.parse(input.module) as ModuleKey;
  const parsed = getModule(key)!.settingsSchema.safeParse(input.settings);
  if (!parsed.success) throw new DomainError('VALIDATION', { message: z.prettifyError(parsed.error) });
  await withTransaction(async (tx) => {
    const e = await editionForWrite(tx, slug);
    const before = moduleSettings(key, e.moduleSettings);
    const after = parsed.data as Record<string, unknown>;
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    await tx.update(editions).set({ moduleSettings: { ...e.moduleSettings, [key]: after }, updatedAt: new Date() }).where(eq(editions.id, e.id));
    await audit(tx, ctx, 'edition.module_settings_saved', { entityType: 'edition', entityId: e.id, edition: slug, before: { [key]: before }, after: { [key]: after } });
  });
}
