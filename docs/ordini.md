# Nucleo ordini (prompt 09)

Tabelle (migrazione `0005_ordini`, solo tabelle nuove): `customers`, `orders_v2`, `order_lines`, `tickets_v2`, `payments`, `refunds_v2`, `checkin_lists`, `checkins`, `attendee_answers`. Nessuna pagina le usa ancora: il collegamento arriva con i prompt 10 e 12.

| Servizio | Dove |
|---|---|
| Prezzi (unica funzione, §6) | `src/server/domain/pricing/cart.ts` |
| Ordini: crea, annulla, scadenza, rimanda biglietti, integrazione, cambio data | `src/server/domain/orders/` |
| Pagamenti e stato derivato | `src/server/domain/payments/` |
| Rimborsi, IBAN cifrato | `src/server/domain/refunds/` |
| Check-in | `src/server/domain/checkin/` |
| Eventi di dominio (dopo il commit) | `src/server/domain/events.ts` |

Regole: posti controllati in transazione con `FOR UPDATE` su quote e date; un ordine in attesa occupa posto fino a `expires_at` (15 minuti online, 48 ore pay-link); `createOrder` è idempotente sulla chiave, `recordPayment` sul riferimento del gestore. Le integrazioni sono ordini collegati (`parent_order_id`) con il loro pagamento.

Scadenza: `GET /api/cron/expire-orders` con `Authorization: Bearer CRON_SECRET`, ogni 5 minuti da `vercel.json`. Il cron ogni 5 minuti richiede il piano Pro di Vercel; col piano gratuito i posti si liberano lo stesso (il conteggio ignora gli ordini scaduti), cambia solo l'aggiornamento dello stato.

## Test sul database

`npm run test:db` ricrea il database locale `proloco_test` (Postgres di `dev/`), applica le migrazioni ed esegue i test `*.db.test.ts` con il driver `pg`. Rifiuta qualsiasi indirizzo che non sia locale e non finisca in `_test`. `npm run test:coverage` fa lo stesso con la copertura.

## Migrazione degli ordini di oggi (prompt 10)

`npm run migrate:orders` copia ordini online, biglietti, ordini di cassa, prenotazioni e richieste di rimborso nel nucleo nuovo, senza toccare le tabelle vecchie. Di default è una prova (tutto annullato alla fine); `-- --conferma` scrive; `-- --edizione <slug>` limita a un'edizione. Le edizioni non concluse si saltano: `-- --anche-in-vendita` solo per le prove in locale.

- I QR già emessi restano validi: `qrCodeData` diventa `tickets_v2.qr_token`.
- Le note si leggono con `parseOrderNotes()`: data → `session_id`, bambini e attività → `attendee_answers`, spostamenti → registro attività, integrazioni → pagamenti separati. Il testo originale resta in `orders_v2.legacy_notes`.
- Le richieste di rimborso del vecchio modulo non avevano un importo: si assume l'intero ordine (segnalato nel report). Quelle che non corrispondono a un ordine finiscono in `docs/migrazione/saltati.md`.
- Articoli di cassa non più nel listino diventano prodotti spenti.

Report: `docs/migrazione/<edizione>.md`. I numeri vengono dalle viste `legacy_vs_v2_online`, `legacy_vs_v2_pos`, `legacy_vs_v2_bookings`, `legacy_vs_v2_refunds` (migrazione `0007`), interrogabili in qualsiasi momento. I report in repository vengono dal database locale con dati finti.

### In produzione, passo per passo (solo con Niccolo)

1. Zuccaland 2026 dichiarata conclusa (niente vendite in corso).
2. Branch Neon copiato dalla produzione; `POSTGRES_URL` del branch in `.env.local` e `REFUND_ENCRYPTION_KEY` di produzione.
3. `npm run db:migrate`, poi `npm run backfill:editions` (prova) e `-- --conferma`.
4. `npm run migrate:orders` (prova): leggere i report, ogni differenza diversa da zero va spiegata.
5. `npm run migrate:orders -- --conferma` sul branch, controllo dell'admin e dello scanner puntati al branch.
6. Solo con l'ok di Niccolo, i punti 3–5 con `POSTGRES_URL` di produzione.
