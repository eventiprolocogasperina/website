// Dati del registro presenze, indipendenti da dove arrivano (ordini di oggi o nucleo nuovo).
// Regole di oggi: un foglio per giorno, prenotazioni in ordine alfabetico di cognome. Funzioni pure.

export type ManifestRow = {
  id: string;
  /** Nome completo dell'acquirente. */
  name: string;
  phone: string | null;
  /** Numero d'ordine mostrato ("#1A2B3C4D" oggi, "ZC26-7F3K" nel nucleo nuovo). */
  code: string;
  persons: number;
  children: number;
  /** Laboratori a pagamento (colonna "You Pick Lab" di Zuccaland). */
  labs: number;
  /** Nomi delle attività scelte. */
  activities: string[];
  /** Chiavi delle colonne attività da spuntare. */
  activityKeys: string[];
  /** Dettaglio dei biglietti per il formato generico. */
  detail: string;
  paid: boolean;
  free: boolean;
  /** Testo dello stato quando non è pagato. */
  statusLabel: string;
  amountCents: number;
};

export type ManifestGroup = {
  /** Data breve nell'intestazione e nella colonna ("sab 17/10/2026"). */
  shortDate: string;
  /** Ordinamento dei fogli (es. l'istante di inizio della data). */
  sortKey: string;
  rows: ManifestRow[];
};

const PARTICLES = ['de', 'di', 'da', 'della', 'del', 'delle', 'lo', 'la', 'li', 'san', 'sant'];

/** Estrae il cognome da una stringa italiana considerando particelle composti (es. De Luca, Di Pietro). */
export function extractLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName.trim().toLowerCase();
  if (parts.length >= 3 && PARTICLES.includes(parts[parts.length - 2].toLowerCase())) {
    return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`.toLowerCase();
  }
  return parts[parts.length - 1].toLowerCase();
}

/** Formatta il nome per il foglio presenze mettendo in evidenza il cognome ("ROSSI Mario"). */
export function formatDisplayName(fullName: string): { surnameFirst: string; original: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { surnameFirst: fullName.trim(), original: fullName.trim() };
  let surname = parts[parts.length - 1];
  let firstNames = parts.slice(0, parts.length - 1).join(' ');
  if (parts.length >= 3 && PARTICLES.includes(parts[parts.length - 2].toLowerCase())) {
    surname = `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
    firstNames = parts.slice(0, parts.length - 2).join(' ');
  }
  return { surnameFirst: `${surname.toUpperCase()} ${firstNames}`, original: fullName.trim() };
}

/** Righe di un giorno in ordine di cognome, poi di nome completo. */
export function sortBySurname<T extends { name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => extractLastName(a.name).localeCompare(extractLastName(b.name), 'it') || a.name.localeCompare(b.name, 'it'));
}

/** Raggruppa per giorno (chiave `shortDate`), ordina i giorni per `sortKey` e le righe per cognome. */
export function groupByDay(rows: Array<ManifestRow & { shortDate: string; sortKey: string }>): ManifestGroup[] {
  const groups = new Map<string, ManifestGroup>();
  for (const { shortDate, sortKey, ...row } of rows) {
    const g = groups.get(shortDate) ?? { shortDate, sortKey, rows: [] };
    g.rows.push(row);
    groups.set(shortDate, g);
  }
  return [...groups.values()].map((g) => ({ ...g, rows: sortBySurname(g.rows) })).sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.shortDate.localeCompare(b.shortDate, 'it'));
}

/** Totali della riga in fondo a ogni giorno. L'incasso conta solo gli ordini pagati. */
export function dayTotals(rows: ManifestRow[]) {
  return rows.reduce(
    (t, r) => ({
      persons: t.persons + r.persons,
      children: t.children + r.children,
      adults: t.adults + Math.max(0, r.persons - r.children),
      labs: t.labs + r.labs,
      amountCents: t.amountCents + (r.paid ? r.amountCents : 0),
    }),
    { persons: 0, children: 0, adults: 0, labs: 0, amountCents: 0 },
  );
}

/** "€ 11,70" come oggi nel registro. */
export const pdfMoney = (cents: number) => `€ ${(cents / 100).toFixed(2).replace('.', ',')}`;
