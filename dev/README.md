# Database locale per i test

Questa cartella crea sul tuo Mac un database **finto** con cui provare il sito in locale.
Il database del sito vero (Neon) non viene mai toccato, e i dati qui dentro sono inventati
(email `@example.com`, nessun cliente reale).

## Cosa contiene

| File | A cosa serve |
|---|---|
| `docker-compose.yml` | Avvia Postgres 17 e un piccolo "traduttore" che imita Neon |
| `neon-proxy/` | Il traduttore: il sito parla con lui come se fosse Neon |
| `sql/01-schema.sql` | Le tabelle, ricavate dal codice del sito |
| `sql/02-seed.sql` | I dati finti (4 eventi, 110 ordini, 388 biglietti, 30 ordini di cassa…) |
| `gen/make_seed.py` | Rigenera `02-seed.sql` (sempre uguale, seed fisso) |

## Uso quotidiano

Serve Docker Desktop acceso e Node 22 o più recente.

```bash
cd "/Users/niccolovono/Projects/Pro Loco/Website_TEST"
docker compose -f dev/docker-compose.yml up -d --build   # avvia il database
npm run db:migrate                                       # applica le migrazioni nuove (drizzle/)
npm run dev                                              # avvia il sito su http://localhost:3000
```

Dopo un azzeramento (`down -v`) il database riparte da `sql/01-schema.sql`, che corrisponde alla
migrazione `0000_baseline`. Prima di `db:migrate` va quindi segnata come già applicata, esattamente
come si farà in produzione:

```bash
npm run db:mark-baseline -- --conferma
npm run db:migrate
```

Nel terminale di `npm run dev` deve comparire la riga
`[LOCAL_DB] Database locale attivo`. Se non c'è, il sito non sta usando il database locale.

| Comando | Effetto |
|---|---|
| `docker compose -f dev/docker-compose.yml down` | Ferma il database (i dati restano) |
| `docker compose -f dev/docker-compose.yml down -v` | Ferma e **azzera**: al prossimo avvio riparte dai dati finti |
| `docker compose -f dev/docker-compose.yml exec postgres psql -U postgres -d main` | Apre una console SQL |

## Come funziona il collegamento

Si attiva solo con `LOCAL_DB=1` in `.env.local` e mai in production:

- `src/instrumentation.ts` dice al driver Neon di mandare le query a `localhost:4444`;
- `next.config.ts` carica il driver una volta sola, così l'impostazione vale per tutte le pagine.

Su Vercel `LOCAL_DB` non esiste, quindi entrambe le parti non fanno nulla.

## Variabili in `.env.local`

```
LOCAL_DB=1
POSTGRES_URL="postgres://postgres:postgres@localhost:5432/main"
DATABASE_URI="postgres://postgres:postgres@localhost:5432/main"
RESEND_API_KEY="re_finta_locale"   # chiave finta: nessuna email parte davvero
AUTH_SECRET="..."                  # una stringa casuale, solo per il locale
ADMIN_PASSWORD_HASH="scrypt...."   # npm run hash-password -- "password-locale"
```

L'admin locale si apre da http://localhost:3000/login con la password di cui hai messo l'hash.
La cassa di prova (http://localhost:3000/cashier) usa il codice evento `FESTA2026`.

## Quando si passa al sito vero

Il database di produzione **non si sostituisce** con questo. Le modifiche alla struttura
(nuove tabelle o colonne) si applicano a Neon come migrazioni, una volta approvate:
la procedura è in `docs/database.md`.
