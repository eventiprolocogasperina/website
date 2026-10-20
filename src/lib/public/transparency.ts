// Contenuti della pagina /trasparenza (§13.6): dati strutturati, modificabili da /admin/sito/trasparenza.
// Ogni salvataggio diventa una versione in `transparency_versions`; se non ce n'è nessuna vale DEFAULT_TRANSPARENCY.
import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1, 'Campo obbligatorio.').max(max, `Al massimo ${max} caratteri.`);
const url = z.string().trim().url('Indirizzo non valido.').max(300).refine((v) => v.startsWith('https://'), 'Usa un link https://.');

export const Treatment = z.object({
  name: text(80),
  data: text(400),
  purpose: text(400),
  legalBasis: text(200),
  retention: text(200),
});
export const Processor = z.object({
  name: text(80),
  service: text(120),
  country: text(80),
  privacyUrl: url,
});
export const CookieItem = z.object({
  name: text(60),
  /** cookie (inviato al server) o storage (memoria del browser, mai inviata). */
  kind: z.enum(['cookie', 'storage']),
  purpose: text(300),
  duration: text(80),
  /** Chi lo riceve: visitatori, staff (admin, cassa, scanner). */
  audience: z.enum(['public', 'staff']),
});

export const TransparencyContent = z.object({
  summary: z.array(text(400)).min(1).max(6),
  treatments: z.array(Treatment).min(1).max(20),
  processors: z.array(Processor).min(1).max(20),
  cookies: z.array(CookieItem).max(30),
  rightsNote: text(1200),
  contactEmail: z.email('Email non valida.').max(120),
});
export type Treatment = z.infer<typeof Treatment>;
export type Processor = z.infer<typeof Processor>;
export type CookieItem = z.infer<typeof CookieItem>;
export type TransparencyContent = z.infer<typeof TransparencyContent>;

export const PRIVACY_REQUEST_KINDS = ['access', 'rectification', 'erasure', 'restriction', 'portability', 'objection', 'other'] as const;
export type PrivacyRequestKind = (typeof PRIVACY_REQUEST_KINDS)[number];
export const PRIVACY_REQUEST_LABELS: Record<PrivacyRequestKind, string> = {
  access: 'Accesso ai miei dati',
  rectification: 'Correzione dei dati',
  erasure: 'Cancellazione dei dati',
  restriction: 'Limitazione del trattamento',
  portability: 'Copia dei dati (portabilità)',
  objection: 'Opposizione al trattamento',
  other: 'Altra richiesta',
};
export const PRIVACY_REQUEST_STATUSES = ['new', 'in_progress', 'done', 'rejected'] as const;
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];
export const PRIVACY_STATUS_LABELS: Record<PrivacyRequestStatus, string> = { new: 'Nuova', in_progress: 'In lavorazione', done: 'Evasa', rejected: 'Respinta' };

export const PrivacyRequestInput = z.object({
  kind: z.enum(PRIVACY_REQUEST_KINDS),
  name: z.string().trim().min(2, 'Scrivi nome e cognome.').max(120),
  email: z.email('Controlla l’email.').max(200),
  message: z.string().trim().max(2000, 'Al massimo 2000 caratteri.').optional().transform((v) => v || null),
  consent: z.literal(true, 'Serve il consenso per gestire la richiesta.'),
  /** Campo trappola per i bot: deve restare vuoto. */
  website: z.string().max(0).optional(),
});
export type PrivacyRequestInput = z.input<typeof PrivacyRequestInput>;

/**
 * Contenuto di partenza, scritto sulla base di quello che il sito fa davvero (ottobre 2026).
 * I tempi di conservazione seguono la proposta del §20.3 (24 mesi dopo l'archiviazione): da confermare con Niccolo.
 */
export const DEFAULT_TRANSPARENCY: TransparencyContent = {
  summary: [
    'Raccogliamo solo i dati che servono a organizzare gli eventi: chi acquista o prenota, chi si iscrive come socio, chi ci scrive.',
    'Non vendiamo né cediamo i tuoi dati per pubblicità. Alcuni fornitori tecnici (hosting, database, pagamenti, email, immagini) li trattano per nostro conto, solo per farci funzionare: li trovi elencati qui sotto.',
    'Il sito usa solo cookie tecnici: niente profilazione, niente pubblicità.',
    'Puoi chiederci in ogni momento di vedere, correggere o cancellare i tuoi dati con il modulo in fondo alla pagina.',
  ],
  treatments: [
    { name: 'Acquisto di biglietti', data: 'Nome, email, telefono, biglietti scelti, data dell’evento, eventuali risposte richieste (es. numero di bambini).', purpose: 'Emettere e inviare i biglietti, controllarli all’ingresso, avvisarti di cambi di programma.', legalBasis: 'Esecuzione del contratto (art. 6.1.b GDPR); obblighi contabili (art. 6.1.c).', retention: '24 mesi dopo la chiusura dell’edizione, poi anonimizzati; i dati contabili 10 anni.' },
    { name: 'Cassa durante l’evento', data: 'Prodotti e importi; nessun dato personale salvo il nome di chi chiede un rimborso.', purpose: 'Registrare i contributi e chiudere la cassa.', legalBasis: 'Obblighi contabili (art. 6.1.c GDPR).', retention: '10 anni (registri contabili).' },
    { name: 'Iscrizione dei soci', data: 'Nome, data e luogo di nascita, codice fiscale, indirizzo, email, telefono.', purpose: 'Tenere il libro soci e convocare le assemblee.', legalBasis: 'Rapporto associativo (art. 6.1.b GDPR); obblighi del Codice del Terzo Settore (art. 6.1.c).', retention: 'Per tutta la durata dell’iscrizione e 10 anni dopo.' },
    { name: 'Richiesta di rimborso', data: 'Nome, email, IBAN (cifrato), motivo della richiesta.', purpose: 'Restituire l’importo con un bonifico.', legalBasis: 'Esecuzione del contratto (art. 6.1.b GDPR).', retention: 'L’IBAN fino al bonifico più 24 mesi; la registrazione del rimborso 10 anni.' },
    { name: 'Foto caricate dai visitatori', data: 'Foto, nome o nickname scelto, eventuale didascalia.', purpose: 'Pubblicarle nella galleria dell’evento dopo l’approvazione.', legalBasis: 'Consenso (art. 6.1.a GDPR), revocabile in ogni momento.', retention: 'Fino alla revoca del consenso o alla rimozione della galleria.' },
    { name: 'Recensioni', data: 'Nome, voto, testo della recensione.', purpose: 'Pubblicare le opinioni dei partecipanti.', legalBasis: 'Consenso (art. 6.1.a GDPR).', retention: 'Fino alla revoca del consenso.' },
    { name: 'Iscrizione “Avvisami”', data: 'Email e consenso.', purpose: 'Avvisarti quando apre la vendita della prossima edizione.', legalBasis: 'Consenso (art. 6.1.a GDPR).', retention: 'Fino alla cancellazione dalla lista (link in ogni email).' },
    { name: 'Widget WhatsApp', data: 'Il tuo numero e il messaggio, solo se scegli di scriverci.', purpose: 'Risponderti.', legalBasis: 'Tua richiesta (art. 6.1.b GDPR).', retention: 'Per il tempo della conversazione, nell’app WhatsApp della Pro Loco.' },
  ],
  processors: [
    { name: 'Vercel Inc.', service: 'Hosting del sito', country: 'Stati Uniti (server in UE)', privacyUrl: 'https://vercel.com/legal/privacy-policy' },
    { name: 'Neon Inc.', service: 'Database', country: 'Stati Uniti (server in UE)', privacyUrl: 'https://neon.tech/privacy-policy' },
    { name: 'Nexi Payments S.p.A.', service: 'Pagamenti con carta', country: 'Italia', privacyUrl: 'https://www.nexi.it/it/privacy' },
    { name: 'Resend Inc.', service: 'Invio delle email (biglietti, ricevute)', country: 'Stati Uniti', privacyUrl: 'https://resend.com/legal/privacy-policy' },
    { name: 'Cloudinary Ltd.', service: 'Archivio delle immagini', country: 'Stati Uniti', privacyUrl: 'https://cloudinary.com/privacy' },
    { name: 'Telegram FZ-LLC', service: 'Notifiche interne allo staff (solo codici e importi)', country: 'Emirati Arabi Uniti', privacyUrl: 'https://telegram.org/privacy' },
    { name: 'Meta Platforms Ireland Ltd. (WhatsApp)', service: 'Messaggi con chi ci scrive', country: 'Irlanda', privacyUrl: 'https://www.whatsapp.com/legal/privacy-policy-eea' },
  ],
  cookies: [
    { name: 'theme', kind: 'storage', purpose: 'Ricorda se preferisci il tema chiaro o scuro.', duration: 'Finché non lo cancelli', audience: 'public' },
    { name: 'acquista:<edizione>', kind: 'storage', purpose: 'Conserva il carrello mentre completi l’acquisto.', duration: 'Fino alla fine dell’acquisto', audience: 'public' },
    { name: 'pl_admin', kind: 'cookie', purpose: 'Sessione dello staff nell’area riservata.', duration: '12 ore', audience: 'staff' },
    { name: 'pl_device', kind: 'cookie', purpose: 'Riconosce un telefono abbinato per cassa e scanner.', duration: '400 giorni', audience: 'staff' },
    { name: 'pl_pin', kind: 'cookie', purpose: 'Ricorda per poco il PIN del volontario sul dispositivo.', duration: '30 minuti di inattività', audience: 'staff' },
    { name: 'pl_cassa', kind: 'cookie', purpose: 'Sessione della cassa.', duration: '16 ore', audience: 'staff' },
    { name: 'pl_edition', kind: 'cookie', purpose: 'Ricorda l’ultima edizione aperta nell’area riservata.', duration: '180 giorni', audience: 'staff' },
  ],
  rightsNote:
    'Puoi chiederci di accedere ai tuoi dati, correggerli, cancellarli, limitarne l’uso, riceverne una copia o opporti al trattamento (artt. 15-22 GDPR). Rispondiamo entro 30 giorni. I dati che la legge ci obbliga a conservare (contabilità) non si possono cancellare prima del tempo previsto. Puoi anche presentare reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).',
  contactEmail: 'prolocogasperina@gmail.com',
};
