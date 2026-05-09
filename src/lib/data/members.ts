// ─── Members Data ─────────────────────────────────────────────
export interface Member {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  tipo: 'ordinario' | 'sostenitore' | 'onorario';
  dataIscrizione: string;
  stato: 'attivo' | 'in attesa' | 'scaduto';
}

export const members: Member[] = [];

// ─── Consiglio Direttivo ──────────────────────────────────────
export const teamMembers = [
  { nome: 'Francesco Martello', ruolo: 'Presidente' },
  { nome: 'Niccolò Vono', ruolo: 'Vicepresidente' },
  { nome: 'Antonella Bellocci', ruolo: 'Segretario' },
  { nome: 'Eleonora Truglia', ruolo: 'Tesoriere' },
  { nome: 'Stefania Fiorentino', ruolo: 'Consigliere' },
  { nome: 'Maria Assunta Fiorentino', ruolo: 'Consigliere' },
  { nome: 'Michele Gualtieri', ruolo: 'Consigliere' },
  { nome: 'Pasquale Lupica', ruolo: 'Consigliere' },
];
