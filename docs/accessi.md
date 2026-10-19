# Accessi: utenti, ruoli, PIN e dispositivi (prompt 07)

Riferimento: ARCHITETTURA §8. Il codice è in `src/server/auth/` e `src/server/domain/{users,devices,audit}`.

## Primo accesso

1. Applica le migrazioni (`npm run db:migrate`): creano `users`, `role_assignments`, `user_sessions`, `devices`, `device_pairings` e `audit_log`.
2. Crea il titolare: `npm run create-owner -- --email nome@esempio.it --name "Nome Cognome"`. La password si scrive quando la chiede. Lo script mostra il database su cui sta per scrivere e chiede conferma.
3. Entra da `/login` con email e password. Gli altri utenti si creano da **Sistema › Utenti**: con l'email ricevono un invito (link valido 7 giorni) per scegliere la password.

## Accesso di emergenza

La vecchia password unica (`ADMIN_PASSWORD_HASH`) funziona **solo** se `ALLOW_LEGACY_ADMIN=true`: si entra lasciando vuota l'email. Vale come titolare e ogni accesso finisce nel registro come "Accesso di emergenza". Da tenere spento in produzione, salvo emergenze.

## Ruoli

I ruoli e i permessi sono quelli del §8.3, scritti in `src/server/auth/permissions.ts` e provati riga per riga in `permissions.test.ts`.
Titolare, amministratore e redattore valgono sempre su tutta l'associazione; responsabile evento, cassiere e ingresso si assegnano a un'edizione oppure a tutta l'associazione.

Finché la tabella `editions` non esiste (prompt 08), ruoli, dispositivi e registro indicano l'edizione con lo slug (`edition_slug`). Per la cassa, gli eventi della configurazione di cassa che non sono edizioni compaiono come "<nome> (cassa)".

L'interfaccia nasconde le voci di menu non permesse (il client riceve solo l'elenco dei permessi); le pagine mostrano "Non hai accesso" e le API rispondono 403.

## Dispositivi e PIN

- **Abbinare**: Sistema › Utenti › Dispositivi › "Abbina dispositivo". Il QR vale 10 minuti e una volta sola; sul telefono si apre `/abbina/<token>` e si conferma. Il dispositivo riceve un cookie `pl_device` httpOnly (circa 13 mesi); nel database c'è solo l'hash.
- **PIN**: ogni volontario ha un PIN di 4–6 cifre (con hash). Dopo 5 errori consecutivi si blocca finché un responsabile non lo reimposta. La sessione PIN scade dopo 30 minuti senza attività.
- **Revocare**: un clic nella tabella dei dispositivi; il dispositivo perde subito l'accesso.
- **Cassa** (`/cashier`): con un dispositivo di cassa si entra con nome e PIN; senza dispositivo resta il codice evento finché `site_settings.legacy_event_code` non è `false` (lo spegne il prompt 14).
- **Scanner** (`/scanner`): con un dispositivo scanner si entra con nome e PIN; senza dispositivo serve la sessione dell'admin.

Un cassiere assegnato a Zuccaland 2026 non può entrare su un dispositivo di un'altra edizione, e le rotte della cassa rifiutano gli eventi diversi da quello del dispositivo.

## Password dimenticata

`/login/password-dimenticata` manda un link valido 30 minuti, che smette di funzionare appena la password cambia. Cambiare password chiude le sessioni aperte altrove. Anche "Cambia password" nel menu utente manda lo stesso link.

In sviluppo, con `EMAIL_DEV_OUTBOX=1`, le email non partono: vengono scritte in `dev/outbox/` (ignorata da git).

## Registro attività

`audit_log` si scrive soltanto: un trigger del database rifiuta UPDATE e DELETE. Ci finiscono accessi (riusciti e non), uscite, creazione e modifica degli utenti, cambi di ruolo, PIN, inviti, abbinamenti e revoche dei dispositivi. Password, PIN, token e IBAN non entrano mai (`sanitizeForAudit`).
Si consulta da **Sistema › Registro attività**, con filtri per persona, azione, edizione e periodo.

## Variabili d'ambiente

| Variabile | A cosa serve |
|---|---|
| `AUTH_SECRET` | Firma dei cookie e dei link. Obbligatoria. |
| `ALLOW_LEGACY_ADMIN` | `true` per accettare la vecchia password unica. |
| `ADMIN_PASSWORD_HASH` | La vecchia password unica (solo con la variabile sopra). |
| `NEXT_PUBLIC_BASE_URL` | Indirizzo del sito nei link delle email e nel QR di abbinamento. |
| `EMAIL_DEV_OUTBOX` | Solo sviluppo: `1` scrive le email in `dev/outbox/`. |

TOTP per titolare e amministratori: la colonna `users.totp_secret` esiste, la verifica non è ancora attiva.
