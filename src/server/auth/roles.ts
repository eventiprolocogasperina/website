export const USER_ROLES = ['owner', 'admin', 'event_manager', 'editor', 'cashier', 'gate'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Titolare',
  admin: 'Amministratore',
  event_manager: 'Responsabile evento',
  editor: 'Redattore',
  cashier: 'Cassiere',
  gate: 'Ingresso',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Può fare tutto, compresa la gestione degli utenti e dei pagamenti.',
  admin: 'Gestisce edizioni, ordini, soci, contenuti e impostazioni.',
  event_manager: 'Gestisce le edizioni assegnate: catalogo, ordini, cassa e ingressi.',
  editor: 'Scrive notizie, pagine, galleria e sponsor; modera foto e recensioni.',
  cashier: 'Vende alla cassa delle edizioni assegnate, con il PIN.',
  gate: 'Controlla i biglietti all’ingresso delle edizioni assegnate, con il PIN.',
};

/** Ruoli che usano il PIN sui dispositivi da campo. */
export const PIN_ROLES: readonly UserRole[] = ['cashier', 'gate', 'event_manager', 'admin', 'owner'];
