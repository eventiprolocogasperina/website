# Database: migrazioni con Drizzle

Lo schema del database è versionato in `drizzle/`. Nessuna pagina o API crea più tabelle o
colonne mentre il sito gira (prima lo facevano `/api/setup`, `api/admin/orders`, `lib/data/tickets.ts`
e `lib/data/cashier.ts`).

| Cosa | Dove |
|---|---|
| Schema delle tabelle esistenti | `src/server/db/schema/legacy.ts` (da `drizzle-kit pull`) |
| Schema delle tabelle nuove | `src/server/db/schema/*.ts`, esportate da `index.ts` |
| Client per il codice server | `src/server/db/client.ts`: `getDb()` e `withTransaction()` |
| Migrazioni SQL | `drizzle/NNNN_nome.sql` + `drizzle/meta/` |

## Comandi

| Comando | Effetto |
|---|---|
| `npm run db:generate -- --name cosa_cambia` | Crea una migrazione confrontando lo schema TypeScript con l'ultima |
| `npm run db:migrate` | Applica le migrazioni non ancora applicate al database di `POSTGRES_URL` |
| `npm run db:studio` | Interfaccia web per guardare i dati |
| `npm run db:mark-baseline -- --conferma` | Segna `0000_baseline` come già applicata (vedi sotto) |

I comandi leggono `POSTGRES_URL` da `.env.local`. **Mai** puntarli alla produzione senza il
consenso esplicito di Niccolo (ARCHITETTURA §18.4).

## Primo passaggio in produzione (una volta sola)

Il database di Neon ha già tutte le tabelle: `0000_baseline` descrive proprio quelle e **non va
eseguita**, va solo registrata come applicata. Procedura, da fare con Niccolo:

1. Su Neon crea un branch di sviluppo dalla produzione (copia istantanea, non tocca i dati veri).
2. Con `POSTGRES_URL` del branch: `npx drizzle-kit pull --out /tmp/prod-pull` e confronta
   `/tmp/prod-pull/schema.ts` con `src/server/db/schema/legacy.ts`. Lo schema locale è stato
   ricavato dal codice: se ci sono differenze (colonne, tipi, indici), si aggiorna `legacy.ts`
   e si rigenera la baseline **prima** di andare avanti.
3. Sempre sul branch: `npm run db:mark-baseline -- --conferma`, poi `npm run db:migrate`.
   Controlla che il sito, puntato al branch, funzioni.
4. Solo allora, con l'ok di Niccolo, ripeti il punto 3 con `POSTGRES_URL` di produzione.

`db:mark-baseline` si rifiuta di agire se trova già migrazioni registrate o se il database è
vuoto (in quel caso basta `db:migrate`).

## Migrazioni

| Migrazione | Cosa aggiunge | Come tornare indietro |
|---|---|---|
| `0004_edizioni_catalogo` | `series`, `editions`, `sessions`, `products`, `quotas`, `quota_products`, `discounts_v2`, `legacy_id_map` e i loro enum | Tabelle solo nuove, nessuna colonna esistente cambia: `DROP TABLE` delle otto tabelle (nell'ordine inverso) e dei cinque enum. Le tabelle di oggi continuano a funzionare. |

## Backfill delle edizioni (prompt 08)

`npm run backfill:editions` legge eventi, Zuccaland e cassa di oggi e crea format, edizioni, date,
prodotti e quote. Senza argomenti lavora dentro una transazione annullata alla fine e stampa solo il
report (quante righe creerebbe, confronto prezzi Zuccaland, cosa salta). Con `-- --conferma` scrive.
È idempotente: le righe già importate sono riconosciute da `legacy_id_map` e non vengono ricreate.

In produzione si esegue solo dopo che Niccolo ha letto il report della prova a secco (ARCHITETTURA §18.4).
