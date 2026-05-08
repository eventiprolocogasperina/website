// ─── Members Data (Admin) ─────────────────────────────────────
export interface Member {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  tipo: 'ordinario' | 'sostenitore' | 'onorario';
  dataIscrizione: string;
  stato: 'attivo' | 'in attesa' | 'scaduto';
}

export const members: Member[] = [
  { id: '1', nome: 'Marco', cognome: 'Russo', email: 'marco.russo@example.com', tipo: 'ordinario', dataIscrizione: '2024-01-15', stato: 'attivo' },
  { id: '2', nome: 'Giulia', cognome: 'Ferraro', email: 'g.ferraro@example.com', tipo: 'sostenitore', dataIscrizione: '2024-03-20', stato: 'attivo' },
  { id: '3', nome: 'Antonio', cognome: 'Bruni', email: 'a.bruni@example.com', tipo: 'ordinario', dataIscrizione: '2023-11-05', stato: 'scaduto' },
  { id: '4', nome: 'Sara', cognome: 'Greco', email: 'sara.greco@example.com', tipo: 'onorario', dataIscrizione: '2022-06-01', stato: 'attivo' },
  { id: '5', nome: 'Luca', cognome: 'De Luca', email: 'l.deluca@example.com', tipo: 'ordinario', dataIscrizione: '2025-02-10', stato: 'in attesa' },
  { id: '6', nome: 'Maria', cognome: 'Mancuso', email: 'm.mancuso@example.com', tipo: 'sostenitore', dataIscrizione: '2024-09-30', stato: 'attivo' },
  { id: '7', nome: 'Francesco', cognome: 'Catanzaro', email: 'f.catanzaro@example.com', tipo: 'ordinario', dataIscrizione: '2025-01-22', stato: 'attivo' },
];

export const teamMembers = [
  { nome: 'Francesco Martello', ruolo: 'Presidente', bio: 'Presidente della Pro Loco Gasperina APS, impegnato nella valorizzazione del territorio.' },
  { nome: 'Niccolò Vono', ruolo: 'Vicepresidente', bio: 'Responsabile dei progetti culturali e delle relazioni con le istituzioni.' },
  { nome: 'Giuseppe Torchia', ruolo: 'Segretario', bio: 'Coordina le attività amministrative e la gestione dei soci.' },
  { nome: 'Anna Procopio', ruolo: 'Tesoriere', bio: 'Gestisce la contabilità e i rapporti con i partner e sponsor.' },
];
