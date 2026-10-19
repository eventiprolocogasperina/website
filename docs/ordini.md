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
