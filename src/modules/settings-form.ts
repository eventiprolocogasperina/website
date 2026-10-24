// Il form delle impostazioni di un modulo si genera dal suo schema zod (§7): niente pagine scritte a mano.
// Qui lo schema diventa una descrizione serializzabile dei campi, che il client disegna.
import { z } from 'zod';
import type { EditionModule } from './types';

export type SettingsField =
  | { key: string; label: string; help?: string; kind: 'boolean' }
  | { key: string; label: string; help?: string; kind: 'number'; min?: number; max?: number; integer: boolean }
  | { key: string; label: string; help?: string; kind: 'text'; maxLength?: number; multiline: boolean }
  | { key: string; label: string; help?: string; kind: 'enum'; options: string[] }
  /** Date dell'edizione (scelta multipla) e prodotto dell'edizione: le opzioni le passa la pagina. */
  | { key: string; label: string; help?: string; kind: 'sessions' }
  | { key: string; label: string; help?: string; kind: 'product' }
  /** Cassa dell'edizione (cash_registers). */
  | { key: string; label: string; help?: string; kind: 'register' }
  | { key: string; label: string; help?: string; kind: 'list'; maxItems?: number; item: SettingsField[]; itemDefaults: Record<string, unknown> };

type JsonSchema = {
  type?: string;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  maxItems?: number;
  default?: unknown;
  anyOf?: JsonSchema[];
  /** Da `.meta({ widget })` nello schema zod. */
  widget?: 'sessions' | 'product' | 'register';
};

function fieldsOf(schema: JsonSchema, labels: EditionModule['settingsLabels'], prefix = ''): SettingsField[] {
  return Object.entries(schema.properties ?? {}).flatMap(([key, raw]): SettingsField[] => {
    const path = prefix + key;
    const base = { key, label: labels?.[path]?.label ?? key, help: labels?.[path]?.help };
    if (raw.widget) return [{ ...base, kind: raw.widget }];
    // Campo che può essere vuoto (nullable): si disegna il tipo non nullo.
    const p = raw.anyOf ? { ...raw, ...(raw.anyOf.find((x) => x.type !== 'null') ?? {}) } : raw;
    if (p.enum) return [{ ...base, kind: 'enum', options: p.enum.map(String) }];
    switch (p.type) {
      case 'boolean':
        return [{ ...base, kind: 'boolean' }];
      case 'integer':
      case 'number':
        return [{ ...base, kind: 'number', min: p.minimum, max: p.maximum, integer: p.type === 'integer' }];
      case 'string':
        return [{ ...base, kind: 'text', maxLength: p.maxLength, multiline: (p.maxLength ?? 0) > 200 }];
      case 'array':
        if (p.items?.type !== 'object') return [];
        return [
          {
            ...base,
            kind: 'list',
            maxItems: p.maxItems,
            item: fieldsOf(p.items, labels, `${path}.`),
            itemDefaults: Object.fromEntries(Object.entries(p.items.properties ?? {}).map(([k, v]) => [k, v.default ?? (v.type === 'boolean' ? false : v.type === 'string' ? '' : v.type === 'array' ? [] : null)])),
          },
        ];
      default:
        return []; // Tipi che il form non sa disegnare: restano ai valori di default.
    }
  });
}

/** Campi del form delle impostazioni. Le etichette dei campi annidati si scrivono "lista.campo". */
export function settingsFields(m: EditionModule): SettingsField[] {
  return fieldsOf(z.toJSONSchema(m.settingsSchema, { io: 'input', unrepresentable: 'any' }) as JsonSchema, m.settingsLabels);
}
