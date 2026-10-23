// Guida agli eventi dell'admin: la gerarchia Format → Edizione → … → Dopo l'evento (pagina /admin/guida,
// stesso testo in docs/GUIDA-EVENTI.md) e una riga d'aiuto per ogni sezione (pulsante "?" della shell).

export type GuideSection = { id: string; title: string; summary: string; points: string[] };

export const GUIDE: GuideSection[] = [
  {
    id: 'format',
    title: '1. Format',
    summary: 'L’evento che si ripete ogni anno: Zuccaland, Assaggia e Passeggia, Gite. Ha logo, colori e una pagina pubblica stabile.',
    points: [
      'Si crea una volta sola, in Format (o nella procedura “Nuova edizione” → Nuovo format).',
      'Logo e colori cambiano poco ogni anno: si aggiornano nel format e valgono per tutte le sue edizioni.',
      'Un evento solo informativo (senza vendite) può anche non avere un format.',
    ],
  },
  {
    id: 'edizione',
    title: '2. Edizione',
    summary: 'Un anno del format (Zuccaland 2027). Si crea almeno 2 settimane prima, nasce in bozza e non si vede sul sito finché non la pubblichi.',
    points: [
      'Edizioni → Nuova edizione: scegli il format e “Parti dall’edizione precedente”. Si copiano pagina, grafica, moduli, regolamento, biglietti e prezzi, attività, casse e notifiche; le date si spostano di un anno, stesso giorno della settimana.',
      'Non si copiano ordini, venduti, ingressi né codici sconto.',
      'Ogni passo della procedura ha “Salta per ora”: la panoramica dell’edizione mostra “Da completare” con quello che manca, in ordine.',
    ],
  },
  {
    id: 'date',
    title: '3. Date e posti',
    summary: 'Ogni giorno (o fascia) è una data con la sua capienza, presa dal piano di sicurezza.',
    points: [
      'Date e capienze: aggiungi i giorni, gli orari e i posti. Una data senza capienza blocca l’apertura delle vendite.',
      'Rinvio per maltempo (modulo): la data rinviata passa alla data di recupero e i clienti ricevono l’email.',
      'Esaurita: scatta da sola quando i posti finiscono e si toglie se se ne liberano.',
    ],
  },
  {
    id: 'biglietti',
    title: '4. Biglietti ed extra',
    summary: 'Nel Catalogo: il biglietto d’ingresso (es. “Intero”) e gli extra (You-Pick Lab, calice di vino).',
    points: [
      'Prezzi in euro, canali: online, cassa, inviti. Lo stesso prezzo vale online e all’ingresso.',
      'Attività gratuite per giorno con i loro posti: Impostazioni → Moduli → Attività e laboratori.',
      'Codici sconto per gli sponsor nel Catalogo; biglietti omaggio per enti e sponsor nel modulo Inviti.',
    ],
  },
  {
    id: 'pagina',
    title: '5. Pagina e regolamento',
    summary: 'La pagina pubblica dell’edizione, a blocchi: copertina, programma, menu e tappe, prezzi (letti dal catalogo), allegati.',
    points: [
      'Pagina pubblica: modifica i blocchi copiati dall’anno scorso e salva.',
      'Regolamento (foto, comportamento, partecipazione, rinvii): è la voce “Regolamento” del blocco Allegati. Il checkout chiede di accettarlo.',
      'Le vendite si aprono solo con date e capienze, un biglietto online, la pagina e il regolamento.',
    ],
  },
  {
    id: 'cassa',
    title: '6. Cassa e ingresso',
    summary: 'Per il giorno dell’evento: almeno due casse e lo scanner all’ingresso.',
    points: [
      'Cassa: la principale all’ingresso vende tutto, le secondarie solo i prodotti scelti.',
      'Abbina i telefoni con il QR e il PIN; ogni volontario entra con il suo PIN.',
      'Check-in: liste d’ingresso e telefoni dello scanner.',
    ],
  },
  {
    id: 'durante',
    title: '7. Durante l’evento',
    summary: 'Segna l’edizione “in corso”: in panoramica trovi ingressi, capienza e attività del giorno.',
    points: [
      'Tutto esaurito: proponi un’altra data (la lista d’attesa nel sito non c’è ancora).',
      'Rinvio deciso dal direttivo: Rinvio per maltempo, poi avviso sui social e email ai clienti.',
      'Vendita all’ingresso dalla cassa, allo stesso prezzo dell’online.',
    ],
  },
  {
    id: 'dopo',
    title: '8. Dopo l’evento',
    summary: 'Dichiara conclusa, chiudi i conti, poi archivia.',
    points: [
      'Recensioni: chiedile con il link alla galleria delle foto.',
      'Rimborsi (pochi, con bonifico) nella sezione Rimborsi.',
      'Rendiconto per il direttivo (PDF e CSV): a edizione conclusa, da Impostazioni → Chiusura e archivio; puoi rigenerarlo finché non archivi. Contiene entrate, costi per categoria, saldo e materiale usato.',
      'Archivia: l’edizione diventa di sola lettura per sempre.',
    ],
  },
  {
    id: 'costi',
    title: '9. Costi',
    summary: 'Le spese di ogni edizione (Costi e rendiconto) e quelle generali dell’associazione (Costi generali), con la ricevuta se c’è.',
    points: [
      'Costi e rendiconto dell’edizione: aggiungi data, categoria, descrizione, fornitore, importo, pagamento e allegato. In alto vedi Entrate, Costi e Saldo.',
      'Si modificano finché l’edizione non è dichiarata conclusa; dopo sono in sola lettura, come il rendiconto.',
      'Un costo sbagliato non si cancella: “Annulla costo” con il motivo. Resta barrato e non conta nei totali.',
      'Costi generali: le spese fuori dagli eventi e il riepilogo per anno (entrate e costi di ogni edizione, costi generali, saldo), anche in CSV.',
    ],
  },
  {
    id: 'inventario',
    title: '10. Inventario',
    summary: 'Il materiale della Pro Loco: quanti pezzi, dove si trova, in che stato.',
    points: [
      'Aggiungi materiale con nome, categoria, quantità, posto e stato (buono, da riparare, fuori uso); foto e valore d’acquisto se servono.',
      '“Porta a un evento” assegna dei pezzi a un’edizione; dopo l’evento, in Costi e rendiconto, “Segna rientrato” dice quanti sono tornati. I mancanti escono come persi.',
      'Persi, rotti o comprati fuori dagli eventi: “Rettifica quantità”, sempre con il motivo.',
      'Il materiale che non c’è più si dismette: esce dall’elenco ma resta nello storico.',
    ],
  },
];

export type SectionHelp = { text: string; guide: string };

/** Una riga per sezione dell'edizione (segmento dopo /admin/e/<edizione>/) e per le pagine dell'associazione. */
const EDITION_HELP: Record<string, SectionHelp> = {
  '': { text: 'Panoramica: prima delle vendite “Da completare” ti dice cosa manca, in ordine; poi numeri e cose da fare.', guide: 'edizione' },
  procedura: { text: 'Procedura guidata: un passo alla volta, ognuno con “Salta per ora”. Tutto resta in bozza.', guide: 'edizione' },
  date: { text: 'Date e capienze: giorni, orari e posti dal piano di sicurezza. Poi: Catalogo.', guide: 'date' },
  catalogo: { text: 'Catalogo: biglietti, extra e prezzi, quote e codici sconto. Poi: Pagina pubblica.', guide: 'biglietti' },
  pagina: { text: 'Pagina pubblica: blocchi della pagina, con il regolamento negli Allegati. Poi: Cassa.', guide: 'pagina' },
  cassa: { text: 'Cassa: casse del giorno dell’evento, prodotti di ogni cassa, telefoni, turni e chiusure Z.', guide: 'cassa' },
  'check-in': { text: 'Check-in: liste d’ingresso, telefoni dello scanner e ingressi in tempo reale.', guide: 'cassa' },
  ordini: { text: 'Ordini: tutti gli acquisti dell’edizione, online, in cassa e inviti.', guide: 'durante' },
  partecipanti: { text: 'Partecipanti: biglietti, persone e risposte alle domande, con l’esportazione.', guide: 'durante' },
  rimborsi: { text: 'Rimborsi: richieste e bonifici dell’edizione.', guide: 'dopo' },
  statistiche: { text: 'Statistiche: vendite per canale, prodotto e giorno, confronto con l’anno scorso.', guide: 'dopo' },
  costi: { text: 'Costi e rendiconto: spese dell’edizione, saldo con le entrate e materiale usato. Modificabili finché l’edizione non è conclusa.', guide: 'costi' },
  impostazioni: { text: 'Impostazioni: dati generali, stato (pubblica, apri le vendite), moduli, chiusura e archivio.', guide: 'dopo' },
  m: { text: 'Modulo: una funzione in più dell’edizione (inviti, rinvio, foto…). Si accende in Impostazioni → Moduli.', guide: 'biglietti' },
};

const ORG_HELP: Record<string, SectionHelp> = {
  '/admin/edizioni/nuova': { text: 'Nuova edizione: scegli il format e parti dall’edizione precedente; i passi dopo si possono saltare.', guide: 'edizione' },
  '/admin/edizioni': { text: 'Edizioni: un’edizione per anno di ogni format. “Nuova edizione” apre la procedura guidata.', guide: 'edizione' },
  '/admin/format': { text: 'Format: gli eventi che si ripetono, con logo, colori e pagina pubblica stabile.', guide: 'format' },
  '/admin/costi': { text: 'Costi generali: spese fuori dalle edizioni e riepilogo per anno di entrate, costi e saldo.', guide: 'costi' },
  '/admin/inventario': { text: 'Inventario: il materiale, dove si trova, in che stato e a quali eventi è andato.', guide: 'inventario' },
};

/** Aiuto della pagina, o null dove non serve. */
export function helpFor(pathname: string): SectionHelp | null {
  const m = pathname.match(/^\/admin\/e\/[^/]+\/?([^/]*)/);
  if (m) return EDITION_HELP[m[1]] ?? null;
  const key = Object.keys(ORG_HELP).find((k) => pathname === k || pathname.startsWith(`${k}/`));
  return key ? ORG_HELP[key] : null;
}
