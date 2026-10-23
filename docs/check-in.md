# Check-in e scanner

Prompt 15. Architettura: §5.2 (nucleo `checkins`/`checkin_lists`), §7 (moduli e `scanner.actions`), §12.3 (scanner).

## Pezzi

| Dove | Cosa |
|---|---|
| `src/server/domain/checkin/` | servizi: `scan`, `revertCheckin`, liste, statistiche, ricerca, offline, azioni dei moduli, flag |
| `src/app/api/scanner/*` | rotte dello scanner (admin con permesso oppure dispositivo + PIN), vedi [mappa-api.md](mappa-api.md) |
| `src/app/scanner/` | `/scanner` (vecchio o nuovo secondo il flag), `/scanner/nuovo` (sempre il nuovo) |
| `src/components/scanner/` | app dello scanner (PWA, mobile first) |
| `src/app/admin/e/[edition]/check-in/` | pagina admin: Andamento, Liste, Dispositivi |

## Flusso dello scanner

Dispositivo abbinato → PIN del volontario → scelta di edizione/lista/data → fotocamera.
Un admin con sessione può aprire lo scanner senza dispositivo (`/scanner/nuovo?edizione=...`).

**Ingresso di gruppo.** Un QR qualsiasi dell'ordine (di solito quello al centro dell'email, che è il primo biglietto) **non fa entrare subito**: si apre "Conferma ingresso" con nome, codice ordine e tutti i biglietti dell'ordine (prodotto e data, es. "Intero", "You-Pick Lab"). Quelli che possono entrare in questa lista e data sono spuntati; già entrati (con l'ora), annullati, di un'altra data o di un'altra lista sono grigi con il motivo. L'operatore toglie la spunta a chi non c'è e tocca **"Fai entrare N"**: un passaggio per biglietto in una sola transazione (`checkinGroup`, `POST /api/scanner/group`), ciascuno con la sua voce `ticket.checked_in` (con `group: N`). Chi nel frattempo è entrato da un altro telefono resta fuori e l'esito lo dice ("Non entrato: …"). Se nessun biglietto dell'ordine può entrare, l'esito è quello del QR letto come prima (già entrato, altra data, annullato…); blacklist, "Da pagare" e QR sconosciuto valgono per tutto l'ordine. La lettura (`previewOrder`, `POST /api/scanner/order`) non registra niente. Dalla ricerca manuale "Fai entrare" su un biglietto resta immediato. "Paga in loco": prima l'incasso, poi la conferma di gruppo. "Annulla ultimo" dopo "Fai entrare N" annulla tutti gli N (un `revertCheckin` per biglietto); dopo i 30 secondi l'annullo resta per biglietto, dalla ricerca o da "Già entrato".

Esito a schermo intero, con vibrazione (non su iOS: Safari non la supporta) e suono:

| Esito | Colore | Testo |
|---|---|---|
| `order` | success | CONFERMA INGRESSO (elenco da spuntare, "Fai entrare N") |
| `entered` | success | VALIDO / ENTRANO IN N (con chi è rimasto fuori); NESSUNO ENTRATO in giallo |
| `valid` | success | VALIDO |
| `already_used` | giallo (`scan-yellow`) | GIÀ ENTRATO alle HH:MM (con il nome del dispositivo) |
| `wrong_session` | giallo (`scan-yellow`) | ALTRA DATA: Dom 25 ott |
| `wrong_list` | danger | LISTA SBAGLIATA |
| `void` | danger | ANNULLATO / NON VALIDO |
| `blocked` | danger | BLOCCATO (ordine in blacklist) con l'avviso "chiama un responsabile"; vince anche su un ordine annullato |
| `unknown` | danger | NON TROVATO |

- **Annulla ultimo**: per 30 secondi dopo un ingresso (online annulla il passaggio con audit; offline toglie il passaggio dalla coda).
- **Annulla ingresso dopo**, con conferma ("Annullare questo ingresso?" → "Annulla l’ingresso" / "Lascia entrato"): dalla ricerca manuale su un biglietto entrato, oppure dall'esito giallo "Già entrato" (pulsante "Annulla questo ingresso"). Permesso `checkin.revert`, serve la rete. Il passaggio non si cancella (§18.5): resta in `checkins` con `reverted_at` e `reverted_by`, più `ticket.checkin_reverted` nel registro con il motivo ("Annullato dopo, dalla ricerca dello scanner" o "… dall’esito «Già entrato» dello scanner"). Il biglietto torna valido. Nell'admin (ordine, partecipanti) l'ingresso si vede soltanto: non c'è un'azione di check-in da annullare.
- **Azioni dei moduli** (`scanner.actions`): es. "+1 Bambino" incrementa la risposta `bambini` dell'ordine (`attendee_answers`, livello ordine) con audit `order.scanner_action`. Accetta numeri, stringhe numeriche e il formato migrato `{bambini, iscritti}`.
- **Pulsanti a pagamento**: vedi sotto.
- **Ricerca manuale**: codice ordine, nome dell'acquirente o del partecipante, QR esatto. Mai email o telefono.
- **Contatori** sempre visibili (entrati / attesi della lista e della data).

## Pulsanti a pagamento (es. "+1 Bambino" con ingresso bambino)

Impostazioni del modulo Attività → "Pulsanti dello scanner": ogni pulsante può avere un **Prodotto da incassare** e una **Cassa che incassa**.

- Senza prodotto, o con un prodotto a 0 €: il pulsante conta e basta, come prima.
- Con un prodotto a pagamento: il pulsante mostra il prezzo e apre un popup di cassa. Prodotto e prezzo arrivano dal server (`GET /api/scanner/action`), si sceglie **Contanti** o **Carta POS** e si conferma (`POST /api/scanner/action` con `method`).
- Il server (`checkin/paid.ts`, `payScannerAction`) crea una vendita con `sell()` della cassa nuova: ordine `pos` pagato, legato all'ordine letto (`parent_order_id`), con la data dell'ordine se il prodotto la richiede, sul **turno aperto** della cassa indicata (o, senza cassa, sul turno aperto da questo telefono). Il conteggio sale nella **stessa transazione** della vendita; il registro `order.scanner_action` riporta codice della vendita e importo.
- Il telefono manda il prezzo che ha mostrato: se nel frattempo è cambiato, `PRICE_CHANGED` e niente incasso. Una chiave di idempotenza per apertura del popup: "Riprova" dopo una rete ballerina non incassa né conta due volte.
- Non si incassa (messaggio nel popup, nessun conteggio) se: il profilo non ha `pos.sell` (il ruolo Varco da solo non basta, serve anche Cassa); la cassa non ha un turno aperto ("Nessun turno aperto sulla cassa «…». Aprilo dall'app Cassa"); il telefono non ha un turno e il pulsante non indica una cassa.
- **Serve la rete**: come gli altri pulsanti dei moduli, non va in coda offline. Senza rete il popup lo dice e non registra nulla.
- I soldi finiscono nella chiusura Z e nel rendiconto della cassa indicata, come ogni vendita di cassa.

## Regole

- Un biglietto di un'altra edizione è `unknown`.
- Se la lista ha una data, vale quella della lista; altrimenti quella scelta sullo scanner.
- **Date rinviate**: un biglietto di una data `postponed` vale nella data di recupero (`rescheduled_to_session_id`, seguendo la catena se il recupero è a sua volta rinviato). Nella data originale è `wrong_session`. Test: `checkin.db.test.ts` ("data rinviata").
- Liste con ingresso multiplo (`allow_multiple`): nessun `already_used`.
- Ordini migrati da Zuccaland 2026: i QR del vecchio sistema sono in `tickets_v2.qr_token` (verificati: 290 su 290), quindi lo scanner nuovo li riconosce. I biglietti online portano lo stesso `qr_token` nel PDF e in "I miei biglietti".

## Concorrenza e velocità

`scan()` fa prima una lettura senza transazione: gli esiti negativi (già entrato, altra data, annullato...) rispondono subito (~20 ms lato server in locale). Solo un biglietto che può entrare apre la transazione: blocco dell'edizione, `FOR UPDATE` sul biglietto, nuovo controllo, inserimento, audit. Due telefoni che scansionano lo stesso QR nello stesso istante ottengono un `valid` e un `already_used` (test con 2 e 10 scansioni in parallelo).

L'ingresso valido costa una transazione WebSocket (un `Pool` per chiamata, §16): in locale, col proxy Neon in Docker, 450-850 ms. In produzione dipende dalla distanza fra funzione e database: da misurare prima dell'evento. I contatori si aggiornano con una chiamata separata, dopo l'esito.

## Offline (sola lettura)

- `/api/scanner/offline?lista=` restituisce gli hash SHA-256 troncati a 32 caratteri dei QR validi per la lista, con la data e un flag "già entrato". Niente nomi, email, telefoni, codici ordine.
- Lo scanner lo scarica ogni 5 minuti e lo tiene in `localStorage`. Senza rete controlla l'hash del QR (WebCrypto) e mette il passaggio in coda con un `client_id`.
- Ingresso di gruppo offline: ogni voce dell'elenco porta anche un numero d'ordine valido solo nell'elenco (non il codice), l'indice del prodotto (`products`) e l'ID del biglietto. Il QR apre così i biglietti dello stesso ordine; "Fai entrare N" mette in coda un passaggio per biglietto (per `ticketId`, con il suo `client_id`). Se la rete cade proprio alla conferma online, gli stessi `client_id` vanno in coda: nessun doppione. Con un elenco scaricato prima di questa versione (solo 3 valori per voce) lo scanner fa entrare un biglietto alla volta, come prima.
- La coda si sincronizza ogni 15 secondi con `/api/scanner/sync`: rimandare lo stesso `client_id` non crea un secondo passaggio. I conflitti (es. biglietto entrato da un altro telefono nel frattempo) sono mostrati in un banner.
- L'orario del passaggio offline è quello del telefono, accettato se entro 24 ore nel passato e 5 minuti nel futuro.
- Limite: non c'è un service worker, quindi la pagina va aperta con la rete; una volta aperta funziona senza.

## Flag `scanner_v2`

`site_settings.scanner_v2` (migrazione `0011_flag_pagine_nuove`, spento). Si accende da Check-in → Dispositivi (permesso `settings.manage`, con audit). Spento: `/scanner` è il vecchio scanner, invariato. Il vecchio scanner scrive sulle tabelle vecchie, il nuovo su `checkins`: non usarli insieme sulla stessa edizione.

## Vecchio → nuovo

| Vecchio scanner | Nuovo |
|---|---|
| Lettura QR e verifica (`/api/tickets/verify`) | `/scanner` nuovo, `/api/scanner/scan` |
| Ricerca per ID biglietto/ordine o nome | Ricerca manuale (codice, nome, QR) |
| "Convalida tutti" / convalida singolo | "Fai entrare" per biglietto dalla ricerca |
| Annulla convalida (`/api/tickets/unverify`) | "Annulla ultimo" per 30 s; dopo, con conferma, dalla ricerca o da "Già entrato"; sempre con audit |
| Extra "+1 Bambino" con pagamento (`/api/orders/add-extra`) | Azione del modulo: solo il conteggio; l'incasso in cassa o con link di pagamento |
| Statistiche (`/api/admin/stats`, `/api/tickets/stats`) | Contatori sullo scanner e pagina admin Check-in |
| Elenco ultime scansioni | Non ripreso: registro attività (audit) |
| Audio on/off, scelta fotocamera, guida PDF | Suono e vibrazione automatici, fotocamera posteriore; guida da rifare |

## Pagina admin Check-in

`/admin/e/[edition]/check-in` (permesso `checkin.scan`):

- **Andamento**: entrati/attesi per data e per lista, ingressi ogni 15 minuti, dispositivi attivi; si aggiorna ogni 15 secondi. "Attesi" = biglietti di ordini che ammettono l'ingresso, non annullati, non in blacklist.
- **Liste**: nome, prodotti inclusi, data, ingresso multiplo. Una lista si elimina solo se non ha passaggi.
- **Dispositivi** (`settings.manage`): abbinamento con QR, revoca, avviso se c'è un solo scanner attivo (servono almeno 2 telefoni per evento), interruttore del flag.

## Audit

`ticket.checked_in` (lista, codice ordine, data; `offline` e orario per i passaggi sincronizzati), `ticket.checkin_reverted`, `order.scanner_action`, `checkin_list.*`, `settings.flag_changed`. Operatore e dispositivo vengono dal contesto.
