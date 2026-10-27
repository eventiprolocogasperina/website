import { z } from 'zod';

/*
 * Libreria dei blocchi delle pagine pubbliche (§13.4). Le props di ogni blocco sono validate da zod
 * sia nell'editor sia sul server quando si salva; ogni campo ha un valore predefinito, così un blocco
 * nuovo nasce da `blockDefaults(type)` e un blocco salvato con una versione vecchia si legge ancora.
 * Questo file non importa nulla del server: lo usano le pagine pubbliche, l'anteprima e l'editor.
 */

const str = (max: number) => z.string().trim().max(max).default('');
/** Indirizzo assoluto (https://) o percorso del sito (/img/…, /zuccaland#acquista). */
const link = z
  .string()
  .trim()
  .max(600)
  .refine((v) => v === '' || /^(https?:\/\/|\/|#)/.test(v), 'Un indirizzo che inizia con https://, / oppure #.')
  .default('');
const list = <T extends z.ZodTypeAny>(item: T, max = 40) => z.array(item).max(max).default([]);

export const BLOCK_SCHEMAS = {
  Hero: z.object({
    badge: str(120),
    title: str(120),
    subtitle: str(240),
    description: str(600),
    logoUrl: link,
    imageUrl: link,
    ctaLabel: str(60),
    /** Vuoto = verso l'acquisto dell'edizione, se è in vendita. */
    ctaHref: link,
  }),
  RichText: z.object({
    eyebrow: str(60),
    title: str(160),
    body: str(8000),
    images: list(link, 4),
    look: z.enum(['scheda', 'riquadro', 'semplice']).default('scheda'),
    align: z.enum(['sinistra', 'centro']).default('sinistra'),
  }),
  Programma: z.object({
    title: str(120),
    intro: str(4000),
    items: list(z.object({ when: str(60), title: str(160), description: str(600) }), 80),
  }),
  Prezzi: z.object({ title: str(120), note: str(400), showExtras: z.boolean().default(true) }),
  CTAAcquisto: z.object({ title: str(120), text: str(400), label: str(60), showFromPrice: z.boolean().default(true) }),
  FAQ: z.object({ title: str(120), intro: str(400), items: list(z.object({ question: str(300), answer: str(3000) }), 60) }),
  Mappa: z.object({ title: str(120), address: str(200), lat: z.number().min(-90).max(90).nullable().default(null), lng: z.number().min(-180).max(180).nullable().default(null), mapsUrl: link }),
  Galleria: z.object({
    title: str(120),
    subtitle: str(300),
    /** Categoria della galleria del sito (es. "assaggia26"): le foto si leggono da lì. */
    category: str(50),
    /** Album di foto webp in public/img/<album> (src/lib/data/albums, creato con `npm run foto`). */
    album: str(60),
    photos: list(z.object({ src: link, alt: str(200) }), 60),
    limit: z.number().int().min(1).max(60).default(12),
  }),
  Video: z.object({ title: str(120), url: link }),
  Sponsor: z.object({ title: str(120) }),
  Countdown: z.object({ title: str(120), target: str(40), doneText: str(200) }),
  Allegati: z.object({ title: str(120), items: list(z.object({ label: str(120), url: link }), 30) }),
  Recensioni: z.object({ title: str(120), source: str(80), limit: z.number().int().min(1).max(30).default(6) }),
  NumeriChiave: z.object({ title: str(120), items: list(z.object({ value: str(20), label: str(80) }), 8) }),
  Tappe: z.object({
    eyebrow: str(60),
    title: str(160),
    items: list(
      z.object({
        number: str(6),
        title: str(160),
        description: str(2000),
        location: str(160),
        mapsUrl: link,
        tasting: str(160),
        producer: str(160),
        allergens: str(300),
        color: str(30),
      }),
    ),
  }),
  Schede: z.object({
    title: str(120),
    look: z.enum(['grandi', 'compatte']).default('grandi'),
    items: list(z.object({ emoji: str(16), title: str(120), text: str(600), color: str(30), chips: list(str(160), 20) }), 12),
  }),
  Edizioni: z.object({ title: str(120) }),
  Avvisami: z.object({ title: str(120), text: str(400), nextDate: str(80) }),
} as const;

export type BlockType = keyof typeof BLOCK_SCHEMAS;
export const BLOCK_TYPES = Object.keys(BLOCK_SCHEMAS) as BlockType[];
export type BlockProps<T extends BlockType> = z.output<(typeof BLOCK_SCHEMAS)[T]>;

const blockOf = <T extends BlockType>(type: T) =>
  z.object({ id: z.string().min(1).max(40), type: z.literal(type), hidden: z.boolean().default(false), props: (BLOCK_SCHEMAS[type] as unknown as z.ZodObject<z.ZodRawShape>).prefault({}) });

export const BlockSchema = z.discriminatedUnion(
  'type',
  BLOCK_TYPES.map((t) => blockOf(t)) as unknown as [ReturnType<typeof blockOf<'Hero'>>, ...ReturnType<typeof blockOf<BlockType>>[]],
);
export type Block = { [T in BlockType]: { id: string; type: T; hidden: boolean; props: BlockProps<T> } }[BlockType];

export const PageBlocksSchema = z.array(BlockSchema).max(60, 'Al massimo 60 blocchi per pagina.');

/** Props predefinite di un blocco nuovo. */
export function blockDefaults<T extends BlockType>(type: T): BlockProps<T> {
  return BLOCK_SCHEMAS[type].parse({}) as BlockProps<T>;
}

export function newBlock<T extends BlockType>(type: T, props: Partial<BlockProps<T>> = {}): Block {
  const id = Math.random().toString(36).slice(2, 10);
  return { id, type, hidden: false, props: BLOCK_SCHEMAS[type].parse(props) } as Block;
}

/**
 * Legge i blocchi salvati senza mai rompere la pagina pubblica: un blocco non valido (tipo sconosciuto,
 * dati di una versione vecchia) si scarta e gli altri restano.
 */
export function readBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((b) => {
    const r = BlockSchema.safeParse(b);
    return r.success ? [r.data as Block] : [];
  });
}
