import type { BlockType } from '@/components/public/blocks/schema';
import { ALBUMS } from '@/lib/data/albums';

/*
 * Come si modifica ogni blocco nell'editor: etichetta, a cosa serve e i campi del modulo nella Sheet.
 * I vincoli (lunghezze, link validi) restano nello schema zod; qui solo la presentazione.
 */

type Base = { key: string; label: string; help?: string };
export type ScalarField = Base & { kind: 'text' | 'textarea' | 'url' | 'image' | 'datetime' | 'color' | 'number' | 'switch' | 'lines' };
export type SelectField = Base & { kind: 'select'; options: Array<{ value: string; label: string }> };
export type ListField = Base & { kind: 'list'; item: string; fields: Array<ScalarField | SelectField> };
export type FieldSpec = ScalarField | SelectField | ListField;

export type BlockMeta = { label: string; description: string; fields: FieldSpec[] };

const title: ScalarField = { key: 'title', label: 'Titolo', kind: 'text' };
const MD = 'Riga vuota = nuovo paragrafo. **grassetto**, *corsivo*, [testo](https://…), "- " per un elenco.';

export const BLOCK_META: Record<BlockType, BlockMeta> = {
  Hero: {
    label: 'Copertina',
    description: 'Logo o titolo, sottotitolo, data e pulsante.',
    fields: [
      { key: 'logoUrl', label: 'Logo', kind: 'image', help: 'Se c’è, prende il posto del titolo (che resta per Google).' },
      title,
      { key: 'subtitle', label: 'Sottotitolo', kind: 'text' },
      { key: 'description', label: 'Descrizione', kind: 'textarea' },
      { key: 'badge', label: 'Data e luogo', kind: 'text', help: 'Es. 17-18 e 25 ottobre 2026 • Gasperina' },
      { key: 'imageUrl', label: 'Immagine grande', kind: 'image' },
      { key: 'ctaLabel', label: 'Testo del pulsante', kind: 'text', help: 'Vuoto = nessun pulsante.' },
      { key: 'ctaHref', label: 'Link del pulsante', kind: 'url', help: 'Vuoto = alla sezione Acquista, solo quando l’edizione vende.' },
    ],
  },
  RichText: {
    label: 'Testo',
    description: 'Titolo e testo libero, con immagini facoltative.',
    fields: [
      { key: 'eyebrow', label: 'Occhiello', kind: 'text' },
      title,
      { key: 'body', label: 'Testo', kind: 'textarea', help: MD },
      {
        key: 'look',
        label: 'Aspetto',
        kind: 'select',
        options: [
          { value: 'scheda', label: 'Scheda bianca' },
          { value: 'riquadro', label: 'Riquadro colorato' },
          { value: 'semplice', label: 'Senza riquadro' },
        ],
      },
      { key: 'align', label: 'Allineamento', kind: 'select', options: [{ value: 'sinistra', label: 'A sinistra' }, { value: 'centro', label: 'Al centro' }] },
      { key: 'images', label: 'Immagini', kind: 'lines', help: 'Un indirizzo per riga, al massimo 4.' },
    ],
  },
  Programma: {
    label: 'Programma',
    description: 'Introduzione e appuntamenti con orario.',
    fields: [
      title,
      { key: 'intro', label: 'Introduzione', kind: 'textarea', help: MD },
      { key: 'items', label: 'Appuntamenti', kind: 'list', item: 'Appuntamento', fields: [{ key: 'when', label: 'Quando', kind: 'text' }, { key: 'title', label: 'Cosa', kind: 'text' }, { key: 'description', label: 'Dettagli', kind: 'textarea' }] },
    ],
  },
  Prezzi: {
    label: 'Prezzi',
    description: 'Biglietti e prezzi letti dal catalogo dell’edizione.',
    fields: [title, { key: 'note', label: 'Nota sotto i prezzi', kind: 'textarea' }, { key: 'showExtras', label: 'Mostra anche gli extra', kind: 'switch' }],
  },
  CTAAcquisto: {
    label: 'Acquista',
    description: 'Riquadro con il pulsante verso il checkout. Compare solo quando si vende.',
    fields: [title, { key: 'text', label: 'Testo', kind: 'textarea' }, { key: 'label', label: 'Testo del pulsante', kind: 'text' }, { key: 'showFromPrice', label: 'Mostra il prezzo “a partire da”', kind: 'switch' }],
  },
  FAQ: {
    label: 'Domande frequenti',
    description: 'Domande e risposte che si aprono con un tocco.',
    fields: [title, { key: 'intro', label: 'Sottotitolo', kind: 'text' }, { key: 'items', label: 'Domande', kind: 'list', item: 'Domanda', fields: [{ key: 'question', label: 'Domanda', kind: 'text' }, { key: 'answer', label: 'Risposta', kind: 'textarea', help: MD }] }],
  },
  Mappa: {
    label: 'Mappa',
    description: 'Mappa del luogo e link a Google Maps.',
    fields: [title, { key: 'address', label: 'Indirizzo', kind: 'text' }, { key: 'lat', label: 'Latitudine', kind: 'number' }, { key: 'lng', label: 'Longitudine', kind: 'number' }, { key: 'mapsUrl', label: 'Link a Google Maps', kind: 'url' }],
  },
  Galleria: {
    label: 'Galleria',
    description: 'Foto scelte a mano, di una categoria della galleria del sito o di un album webp.',
    fields: [
      title,
      { key: 'subtitle', label: 'Sottotitolo', kind: 'text' },
      { key: 'category', label: 'Categoria della galleria', kind: 'text', help: 'Es. assaggia26. Le foto si aggiornano da Sito › Galleria.' },
      {
        key: 'album',
        label: 'Album di foto',
        kind: 'select',
        help: 'Le cartelle di foto webp del sito. Un album nuovo si crea con npm run foto.',
        options: [{ value: 'nessuno', label: 'Nessun album' }, ...ALBUMS.map((a) => ({ value: a.name, label: `${a.name} (${a.count} foto)` }))],
      },
      { key: 'photos', label: 'Foto scelte', kind: 'list', item: 'Foto', fields: [{ key: 'src', label: 'Immagine', kind: 'image' }, { key: 'alt', label: 'Descrizione', kind: 'text' }] },
      { key: 'limit', label: 'Quante foto mostrare all’inizio', kind: 'number', help: 'Le altre si aprono con “Mostra altre foto”.' },
    ],
  },
  Video: { label: 'Video', description: 'Un video di YouTube.', fields: [title, { key: 'url', label: 'Link di YouTube', kind: 'url' }] },
  Sponsor: { label: 'Sponsor', description: 'Gli sponsor attivi, da Sito › Sponsor.', fields: [title] },
  Countdown: {
    label: 'Conto alla rovescia',
    description: 'Giorni, ore e minuti a una data.',
    fields: [title, { key: 'target', label: 'Data e ora', kind: 'datetime' }, { key: 'doneText', label: 'Testo a tempo scaduto', kind: 'text' }],
  },
  Allegati: {
    label: 'Regolamento e allegati',
    description: 'Link a PDF e documenti.',
    fields: [title, { key: 'items', label: 'Allegati', kind: 'list', item: 'Allegato', fields: [{ key: 'label', label: 'Nome', kind: 'text' }, { key: 'url', label: 'Link', kind: 'url' }] }],
  },
  Recensioni: {
    label: 'Recensioni',
    description: 'Le recensioni lasciate dai visitatori.',
    fields: [title, { key: 'source', label: 'Evento delle recensioni', kind: 'text', help: 'Es. assaggia-passeggia.' }, { key: 'limit', label: 'Quante al massimo', kind: 'number' }],
  },
  NumeriChiave: {
    label: 'Numeri chiave',
    description: 'Fino a 8 numeri grandi con didascalia.',
    fields: [title, { key: 'items', label: 'Numeri', kind: 'list', item: 'Numero', fields: [{ key: 'value', label: 'Numero', kind: 'text' }, { key: 'label', label: 'Didascalia', kind: 'text' }] }],
  },
  Tappe: {
    label: 'Tappe',
    description: 'Le tappe del percorso con degustazione.',
    fields: [
      { key: 'eyebrow', label: 'Occhiello', kind: 'text' },
      title,
      {
        key: 'items',
        label: 'Tappe',
        kind: 'list',
        item: 'Tappa',
        fields: [
          { key: 'number', label: 'Numero', kind: 'text' },
          { key: 'title', label: 'Nome', kind: 'text' },
          { key: 'location', label: 'Luogo', kind: 'text' },
          { key: 'mapsUrl', label: 'Link alla mappa', kind: 'url' },
          { key: 'description', label: 'Descrizione', kind: 'textarea' },
          { key: 'tasting', label: 'In degustazione', kind: 'text' },
          { key: 'producer', label: 'Produttore', kind: 'text' },
          { key: 'allergens', label: 'Allergeni', kind: 'text' },
          { key: 'color', label: 'Colore', kind: 'color' },
        ],
      },
    ],
  },
  Schede: {
    label: 'Schede',
    description: 'Schede con emoji, testo e voci (attività, giochi, cibo).',
    fields: [
      title,
      { key: 'look', label: 'Aspetto', kind: 'select', options: [{ value: 'grandi', label: 'Schede grandi' }, { value: 'compatte', label: 'Righe compatte' }] },
      {
        key: 'items',
        label: 'Schede',
        kind: 'list',
        item: 'Scheda',
        fields: [
          { key: 'emoji', label: 'Emoji', kind: 'text' },
          { key: 'title', label: 'Titolo', kind: 'text' },
          { key: 'text', label: 'Testo', kind: 'textarea' },
          { key: 'color', label: 'Colore', kind: 'color' },
          { key: 'chips', label: 'Voci', kind: 'lines', help: 'Una voce per riga.' },
        ],
      },
    ],
  },
  Edizioni: { label: 'Edizioni passate', description: 'Link alle altre edizioni del format.', fields: [title] },
  Avvisami: {
    label: 'Avvisami',
    description: 'Prossima edizione e iscrizione all’avviso di apertura vendite.',
    fields: [title, { key: 'nextDate', label: 'Quando (se si sa)', kind: 'text', help: 'Es. ottobre 2027' }, { key: 'text', label: 'Testo', kind: 'textarea' }],
  },
};

/** Una riga che riassume il blocco nell'elenco dell'editor. */
export function blockSummary(props: Record<string, unknown>): string {
  for (const k of ['title', 'subtitle', 'question', 'body', 'intro', 'text', 'url', 'category']) {
    const v = props[k];
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 80);
  }
  const items = props.items;
  return Array.isArray(items) && items.length ? `${items.length} elementi` : '';
}
