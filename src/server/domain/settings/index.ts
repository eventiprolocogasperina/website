import 'server-only';
import { inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { siteSettings } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';

// Impostazioni dell'associazione nelle pagine di Sistema (prompt 18). Restano in site_settings, una
// chiave per campo, con gli stessi nomi di prima dove esistevano (contact_email, whatsapp_topics,
// wa_*, zuccaland_postponed_*): le rotte di oggi le leggono ancora. I segreti (token, chiavi) non
// passano mai da qui: si leggono dall'env e la pagina mostra solo se sono impostati.

const text = (max = 500) => z.string().trim().max(max).default('');
const url = z.union([z.literal(''), z.url('Scrivi un indirizzo che inizia con https://').trim()]).default('');

export const SupportTopic = z.object({
  id: z.string().min(1).max(40),
  label: z.string().trim().min(2, 'Scrivi il testo dell’argomento.').max(80),
  phone: z.string().regex(/^\d{8,15}$/, 'Numero WhatsApp con prefisso, senza + e senza spazi (es. 393331234567).'),
});
export const TelegramChat = z.object({ id: z.string().regex(/^-?\d{1,20}$/, 'L’ID di una chat Telegram è un numero.'), label: z.string().trim().max(60).default('') });
export const WhatsappTemplate = z.object({
  name: z.string().regex(/^[a-z0-9_]{1,512}$/, 'Nome del modello come su Meta: minuscole, numeri e _.'),
  language: z.string().regex(/^[a-z]{2}(_[A-Z]{2})?$/).default('it'),
  /** Testo approvato, con {{1}}, {{2}}… come su Meta: serve per l'anteprima. */
  body: z.string().trim().min(1).max(1024),
  /** Variabile del sito per ogni {{n}}, in ordine. */
  params: z.array(z.enum(['cliente.nome', 'ordine.codice', 'edizione.titolo', 'sessione.data'])).max(5).default([]),
});

export const SETTINGS_SECTIONS = {
  general: z.object({
    association_name: text(120),
    association_tax_code: text(20),
    association_address: text(200),
    contact_email: z.union([z.literal(''), z.email('Email non valida.').trim()]).default(''),
    contact_phone: text(30),
    social_instagram: url,
    social_facebook: url,
    social_tiktok: url,
    social_youtube: url,
    seo_title: text(70),
    seo_description: text(160),
    seo_image: url,
    whatsapp_topics: z.array(SupportTopic).max(10).default([]),
  }),
  /** Avviso di rinvio sulla pagina Zuccaland di oggi (rotta /api/zuccaland/alert), finché esiste. */
  legacy_notice: z.object({
    zuccaland_postponed_enabled: z.boolean().default(false),
    zuccaland_postponed_title: text(120),
    zuccaland_postponed_new_date: text(80),
    zuccaland_postponed_message: text(600),
  }),
  telegram: z.object({
    telegram_alert_chat_id: z.union([z.literal(''), z.string().regex(/^-?\d{1,20}$/, 'L’ID di una chat Telegram è un numero.')]).default(''),
    telegram_allowed_chats: z.array(TelegramChat).max(10).default([]),
  }),
  whatsapp: z.object({
    wa_phone_number_id: z.union([z.literal(''), z.string().regex(/^\d{5,20}$/, 'Il Phone Number ID è un numero.')]).default(''),
    whatsapp_templates: z.array(WhatsappTemplate).max(20).default([]),
    /** Campi del rinvio di oggi (pagina Ordini di prima): stessi nomi e stesso uso. */
    wa_template_name: text(512),
    wa_language_code: text(10),
    wa_postponement_message: text(1024),
    email_postponement_subject: text(200),
    email_postponement_body: text(3000),
  }),
} as const;

export type SettingsSection = keyof typeof SETTINGS_SECTIONS;
export type SectionValues<S extends SettingsSection> = z.output<(typeof SETTINGS_SECTIONS)[S]>;

const JSON_KEYS = new Set(['whatsapp_topics', 'telegram_allowed_chats', 'whatsapp_templates']);
const BOOL_KEYS = new Set(['zuccaland_postponed_enabled']);

function decode(key: string, raw: string | undefined): unknown {
  if (raw === undefined) return undefined;
  if (BOOL_KEYS.has(key)) return raw === 'true';
  if (!JSON_KEYS.has(key)) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

const encode = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'boolean' ? String(v) : JSON.stringify(v));

/** Righe grezze di site_settings per queste chiavi. */
export async function readSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await getDb().select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings).where(inArray(siteSettings.key, keys));
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Valori di una sezione, con i default per le chiavi mancanti o rovinate. */
export async function getSettings<S extends SettingsSection>(section: S): Promise<SectionValues<S>> {
  const schema = SETTINGS_SECTIONS[section];
  const keys = Object.keys(schema.shape);
  const raw = await readSettings(keys);
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const field = schema.shape[key as keyof typeof schema.shape] as z.ZodType;
    const parsed = field.safeParse(decode(key, raw[key]));
    out[key] = parsed.success ? parsed.data : field.parse(undefined);
  }
  return out as SectionValues<S>;
}

/** Salva una sezione: solo chi gestisce le impostazioni, nel registro con i valori (nessun segreto qui). */
export async function saveSettings<S extends SettingsSection>(ctx: Ctx, section: S, input: z.input<(typeof SETTINGS_SECTIONS)[S]>): Promise<SectionValues<S>> {
  if (!can(ctx, 'settings.manage')) throw new DomainError('FORBIDDEN');
  const data = SETTINGS_SECTIONS[section].parse(input) as Record<string, unknown>;
  const before = await getSettings(section);
  await withTransaction(async (tx) => {
    for (const [key, value] of Object.entries(data)) {
      await tx
        .insert(siteSettings)
        .values({ key, value: encode(value) })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: encode(value), updatedAt: sql`CURRENT_TIMESTAMP` } });
    }
    const changed = Object.keys(data).filter((k) => encode(data[k]) !== encode((before as Record<string, unknown>)[k]));
    await audit(tx, ctx, 'settings.saved', { entityType: 'setting', entityId: section, before: pick(before, changed), after: pick(data, changed) });
  });
  return data as SectionValues<S>;
}

const pick = (o: object, keys: string[]) => Object.fromEntries(keys.map((k) => [k, (o as Record<string, unknown>)[k]]));

/** Presenza delle variabili d'ambiente segrete, senza mai restituirne il valore. */
export function secretStatus(names: string[]): Record<string, boolean> {
  return Object.fromEntries(names.map((n) => [n, !!process.env[n]]));
}
