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

Esito a schermo intero, con vibrazione (non su iOS: Safari non la supporta) e suono:

| Esito | Colore | Testo |
|---|---|---|
| `valid` | success | VALIDO |
| `already_used` | warning | GIÀ ENTRATO alle HH:MM (con il nome del dispositivo) |
| `wrong_session` | warning | ALTRA DATA: Dom 25 ott |
| `wrong_list` | danger | LISTA SBAGLIATA |
| `void` | danger | ANNULLATO / NON VALIDO |
| `blocked` | danger | BLOCCATO (ordine in blacklist) |
| `unknown` | danger | NON TROVATO |

- **Annulla ultimo**: per 30 secondi dopo un ingresso (online annulla il passaggio con audit; offline toglie il passaggio dalla coda).
- **Azioni dei moduli** (`scanner.actions`): es. "+1 Bambino" incrementa la risposta `bambini` dell'ordine (`attendee_answers`, livello ordine) con audit `order.scanner_action`. Accetta numeri, stringhe numeriche e il formato migrato `{bambini, iscritti}`. Non registra pagamenti.
- **Ricerca manuale**: codice ordine, nome dell'acquirente o del partecipante, QR esatto. Mai email o telefono.
- **Contatori** sempre visibili (entrati / attesi della lista e della data).

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
| Annulla convalida (`/api/tickets/unverify`) | "Annulla ultimo" per 30 s; annullamento con audit |
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
