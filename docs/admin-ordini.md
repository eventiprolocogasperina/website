# Admin: ordini, partecipanti, rimborsi, clienti (prompt 12)

Pagine dell'admin che leggono solo il nucleo nuovo (`orders_v2`, `tickets_v2`, `payments`, `refunds_v2`, `customers`).
Ogni scrittura passa da una Server Action → servizio di dominio (permesso, zod, transazione, edizione archiviata,
registro attività).

## Rotte

| Rotta | Cosa | Permesso |
|---|---|---|
| `/admin/e/[edition]/ordini` | Elenco ordini dell'edizione | `orders.read` sull'edizione |
| `/admin/ordini` | Elenco di tutte le edizioni (flag acceso) o pagina di prima (flag spento) | `orders.read` sull'associazione |
| `…/ordini/[code]` | Dettaglio (§10.5), sia globale sia di edizione | `orders.read` sull'edizione dell'ordine |
| `…/ordini/esporta` | CSV con gli stessi filtri dell'elenco, o `?ids=` per la selezione | `reports.export` |
| `/admin/e/[edition]/partecipanti` | Un biglietto per riga: risposte, data, ingresso | `orders.read` |
| `…/partecipanti/esporta?formato=pdf\|csv[&sessione=]` | Registro presenze PDF (un foglio per giorno, per cognome) o CSV | `reports.export` |
| `/admin/e/[edition]/rimborsi`, `/admin/rimborsi` | Coda rimborsi (la globale solo con il flag) | `orders.read`; azioni con `orders.refund` |
| `…/rimborsi/esporta` | CSV dei bonifici da fare (rimborsi approvati con bonifico) | `reports.export` |
| `/admin/clienti`, `/admin/clienti/[id]` | Clienti e scheda con storico, consensi, note, unione | `customers.read`; modifiche anche `orders.edit` |
| `/admin/prenotazioni` | Pagina di prima (flag spento) o redirect ai Partecipanti dell'edizione scelta | `orders.read` |

L'elenco è un solo componente (`src/components/admin/orders/OrdersListPage.tsx`) con `edition` null o lo slug;
così il dettaglio (`detail/OrderDetailPage.tsx`) e la coda rimborsi (`refunds/RefundsPage.tsx`).

## Flag `orders_v2`

In `site_settings` come `legacy_event_code`, spento dalla migrazione `0011_flag_pagine_nuove`. Le pagine nuove
esistono comunque e si raggiungono dalla sidebar dell'edizione. Acceso, `/admin/ordini` e `/admin/rimborsi`
mostrano le pagine nuove globali e `/admin/prenotazioni` porta a `/admin/vai/partecipanti`. Si accende e si spegne
dall'interruttore "Pagine nuove predefinite" in testa a Ordini (solo con `settings.manage`), e resta nel registro.

Consiglio: accenderlo dopo il merge del checkout nuovo (prompt 13) e dopo la chiusura di Zuccaland 2026, quando
la pagina di prima non serve più per WhatsApp e le email una tantum (vedi sotto).

## Elenco ordini

- Filtri nell'URL: `q`, `stato` (più valori separati da virgola), `canale`, `sessione`, `dal`/`al` (giorni a Roma),
  `sconto` (`si` o il codice), `blacklist` (`si`/`no`), `rimborso=si`, `ordina`, `pagina`; nella vista globale
  anche `edizione`. Funzioni pure in `src/lib/admin/order-filters.ts`.
- Viste: tab fissi nel codice (Tutti, Da pagare, Pagati, Rimborsati, Blacklist) più le viste dell'utente in
  `admin_saved_views` (per utente, al massimo 20, senza la pagina). Scelta: le viste predefinite sono uguali per
  tutti e cambiano con il codice; quelle personali stanno nel database perché si usano da più dispositivi
  (telefono alla cassa, computer a casa), cosa che il `localStorage` non permette.
- Ricerca con debounce di 300 ms su codice, nome, email, telefono (`ILIKE`, caratteri jolly disinnescati).
- Azioni di massa: reinvia biglietti, esporta CSV, sposta data (modulo Rinvio), invia messaggio (modulo Broadcast,
  un'email per indirizzo; nel registro solo i numeri, mai gli indirizzi).
- "Nuovo ordine" in un pannello: canale `admin` (pagato subito in contanti, POS o bonifico, oppure in attesa) o
  `paylink` se il modulo è attivo. Il totale mostrato è una stima; prezzi, sconti e posti li calcola il server.
- Sotto 768 px la tabella diventa un elenco di schede con selezione e paginazione.

## Dettaglio ordine

Layout §10.5. Menu ⋯: Modifica cliente, Segna come pagato, Rimborsa, Annulla, Blacklist, Scarica PDF (arriva con
il checkout nuovo), poi le azioni dei moduli (`extensionPoints.orderActions`): Sposta data (`moveSession`) e
Crea link di pagamento (`createPaylinkFromOrder`: integrazione collegata se l'ordine è pagato, altrimenti ordine
pay-link nuovo; mostra il codice). I riquadri dei moduli (`extensionPoints.orderPanels`) hanno un caricatore in
`src/server/domain/orders/admin-panels.ts` e un componente con la stessa chiave in `detail/panels.tsx`.

Rimborsa: righe da rimborsare → importo calcolato e modificabile fino al rimborsabile, metodo, motivo, "già
eseguito". Sopra 100 € si scrive il codice dell'ordine; il server ripete il controllo (`refundOrder`), poi
`createRefund` e, se eseguito, `markRefundPaid`.

## Rimborsi

Coda con tab per stato (si apre su "Da gestire"), approva → segna eseguito, oppure rifiuta con motivo. L'IBAN è
sempre mascherato (`IT60 •••• •••• 3456`); l'occhio chiama `revealIban`, che lo registra (`refund.iban_viewed`).
CSV dei bonifici con l'IBAN intero solo se l'utente lo può vedere su tutte le edizioni esportate
(`refund.iban_exported` nel registro, con i soli id).

## Clienti

Elenco con ordini e speso su tutte le edizioni. Scheda: ordini (anche dei doppioni uniti, con l'email usata),
consensi, note interne, revoca del consenso newsletter (l'admin non può darlo al posto del cliente), unione dei
doppioni con conferma scrivendo l'email del doppione. L'unione non tocca gli ordini: il doppione prende
`merged_into_id` e `deleted_at`; un doppione già unito porta con sé quelli uniti a lui.

## Prestazioni

Paginazione lato server da 50 righe. Indici aggiunti (migrazione `0010_admin_cassa_scanner`):

- `orders_v2_created_idx` (`created_at desc, id`): elenco globale in ordine di data;
- `orders_v2_edition_created_idx` (`edition_id, created_at desc`): elenco di un'edizione;
- `orders_v2_session_idx` (`session_id`): filtro per sessione e spostamenti;
- `audit_log_entity_idx` (`entity_type, entity_id`): cronologia del dettaglio.

I conteggi di check-in si leggono solo per le 50 righe mostrate. Misura con dati generati (2.000 ordini
nell'edizione, 8.000 in un'altra, 4.000+16.000 biglietti), Postgres 17 locale, chiamate a caldo:

| Operazione | Tempo |
|---|---|
| Elenco edizione, pagina 1 / pagina 40 | 22 ms / 18 ms |
| Elenco globale (10.000+ ordini) | 23 ms |
| Ricerca testuale | 19 ms |
| Filtri stato + canale, ordinati per totale | 9 ms |
| Numeri dei tab | 7 ms |
| Dettaglio ordine | 49 ms |
| Partecipanti, pagina 1 | 21 ms |
| CSV di 2.000 ordini | 62 ms |

Per ripeterla: `PERF=1 TEST_DATABASE_URL=… npx vitest run --project db src/server/domain/orders/admin-perf.db.test.ts`.
Non serve `pg_trgm` a questi volumi; da rivalutare oltre ~50.000 ordini con ricerche lente.

## Da OrderManager / RefundManager / BookingManager alle pagine nuove

| Prima | Ora |
|---|---|
| OrderManager: schede per evento | Selettore edizione + Ordini dell'edizione; vista globale con filtro Edizione |
| OrderManager: ricerca e filtro stato | Ricerca con debounce e filtri nell'URL, viste salvate |
| OrderManager: KPI e incassi in testa | Panoramica e Statistiche dell'edizione (fuori da questo prompt) |
| OrderManager: segna pagato | Dettaglio → ⋯ → Segna come pagato (`markOrderPaid`, importo dal server) |
| OrderManager: reinvia email biglietti | "Reinvia biglietti" nel dettaglio e in massa (`order.tickets_resent` → `sendOrderTickets`) |
| OrderManager: elimina / cestino / ripristina | Annulla ordine (`cancelOrder`); nessuna cancellazione fisica (§18), niente cestino |
| OrderManager: ordine di prova | Non portato: si usa il simulatore Nexi del checkout nuovo |
| OrderManager: modifica ordine (dati cliente, note) | ⋯ → Modifica cliente; Note interne (solo aggiunte, con autore) |
| OrderManager: ordine manuale | "Nuovo ordine" (canale admin) |
| OrderManager: pay-by-link | "Nuovo ordine" con canale pay-link e ⋯ → Crea link di pagamento; la pagina di pagamento arriva con il prompt 13 |
| OrderManager: cambio data | ⋯ → Sposta data (modulo Rinvio), anche in massa |
| OrderManager: blacklist | ⋯ → Metti in blacklist (motivo obbligatorio), vista "Blacklist" |
| OrderManager: CSV e PDF registro presenze | Partecipanti → Registro PDF (stesso disegno, attività dalle impostazioni del modulo) e CSV |
| OrderManager: email aggiornamento orari, banner meteo, email/WhatsApp di rinvio, grazie A&P | Restano nella pagina di prima (flag spento) o nel modulo Rinvio; "Invia messaggio" copre le email libere |
| OrderManager: scarica PDF biglietti | Voce presente ma disattivata fino al merge del prompt 13 |
| RefundManager: elenco e filtri | Coda rimborsi con tab per stato e ricerca |
| RefundManager: cambio stato | Approva / Segna eseguito / Rifiuta (con motivo) |
| RefundManager: copia IBAN | Occhio → IBAN intero (registrato) → Copia; CSV bonifici |
| RefundManager: note | Note interne dell'ordine |
| RefundManager: elimina | Nessuna (§18) |
| BookingManager: prenotazioni e stati | Partecipanti (un biglietto per riga) e Ordini |
| BookingManager: check-in | Colonna Ingresso; il check-in si fa dallo scanner |
| BookingManager: CSV | Partecipanti → CSV |

## Domande aperte

- **SEPA XML**: oggi c'è il CSV dei bonifici. Serve il file pain.001 per caricarli in blocco? Con quale banca
  (versione pain.001.001.03 o .09, CBI)?
- **Scanner e blacklist**: `scan` non controlla `is_blacklisted`. Lo scanner è fuori da questo prompt; da decidere
  se un ordine in blacklist entra con un avviso o viene bloccato.
- **WhatsApp**: l'invio WhatsApp resta nella pagina di prima finché il modulo Broadcast non avrà il suo canale.
