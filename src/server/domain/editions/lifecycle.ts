// Ciclo di vita di un'edizione (§9). Funzioni pure.
import type { Permission } from '@/server/auth/permissions';
import type { EditionStatus } from './types';

export type StatusTransition = {
  to: EditionStatus;
  /** Testo del pulsante nell'admin. */
  label: string;
  /** Conseguenza, mostrata nella conferma. */
  description: string;
  permission: Permission;
  /** Azioni pesanti: richiedono di digitare il nome dell'edizione. */
  typeToConfirm?: boolean;
};

const T = (to: EditionStatus, label: string, description: string, extra: Partial<StatusTransition> = {}): StatusTransition => ({
  to,
  label,
  description,
  permission: 'editions.edit',
  ...extra,
});

const suspend = T('suspended', 'Sospendi', 'L’edizione resta visibile con un avviso di sospensione o rinvio. Le vendite si fermano.');

export const TRANSITIONS: Record<EditionStatus, StatusTransition[]> = {
  draft: [T('published', 'Pubblica', 'L’edizione diventa visibile sul sito con “Biglietti presto disponibili”.')],
  published: [
    T('on_sale', 'Apri le vendite', 'Si possono acquistare i biglietti online.'),
    T('draft', 'Torna in bozza', 'L’edizione non è più visibile sul sito.'),
    suspend,
  ],
  on_sale: [
    T('live', 'Segna come in corso', 'L’edizione è in svolgimento: in evidenza la modalità “Giorno dell’evento”.'),
    T('sold_out', 'Segna come esaurita', 'Le vendite online si fermano perché i posti sono finiti.'),
    T('published', 'Chiudi le vendite', 'L’edizione resta visibile ma non si possono più acquistare biglietti.'),
    suspend,
  ],
  sold_out: [
    T('on_sale', 'Riapri le vendite', 'Si possono di nuovo acquistare i biglietti online.'),
    T('live', 'Segna come in corso', 'L’edizione è in svolgimento.'),
    suspend,
  ],
  live: [
    T('concluded', 'Dichiara conclusa', 'Le vendite si chiudono e si apre la checklist di chiusura. Il sito mostra la pagina “Grazie”.', { typeToConfirm: true }),
    suspend,
  ],
  suspended: [
    T('published', 'Riprendi (senza vendite)', 'L’edizione torna visibile, con le vendite chiuse.'),
    T('on_sale', 'Riprendi e apri le vendite', 'L’edizione torna in vendita.'),
    T('concluded', 'Dichiara conclusa', 'L’edizione non si svolgerà più: si apre la checklist di chiusura.', { typeToConfirm: true }),
  ],
  concluded: [
    T('archived', 'Archivia', 'L’edizione diventa di sola lettura per sempre: nessuna modifica a date, prodotti, ordini o impostazioni.', {
      permission: 'editions.archive',
      typeToConfirm: true,
    }),
  ],
  archived: [],
};

export function transitionFor(from: EditionStatus, to: EditionStatus): StatusTransition | null {
  return TRANSITIONS[from].find((t) => t.to === to) ?? null;
}

/** Un'edizione archiviata è in sola lettura (§5.4). */
export function isReadOnly(status: EditionStatus): boolean {
  return status === 'archived';
}
