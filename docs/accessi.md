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

- **Abbinare**: Sistema › Utenti › Dispositivi › "Abbina dispositivo" (oppure Cassa › Dispositivi e Check-in dell'edizione). Nel dialogo si sceglie il nome e il **ruolo** del dispositivo (Cassa o Varco); insieme al QR compare un **PIN di 6 cifre**. QR e PIN valgono 10 minuti e una volta sola; sul telefono si apre `/abbina/<token>`, si digita il PIN e si conferma. Il dispositivo riceve il ruolo scelto e un cookie `pl_device` httpOnly (circa 13 mesi); nel database ci sono solo gli hash di token e PIN. Al quinto PIN sbagliato il QR non vale più (ne serve uno nuovo) e i tentativi finiscono nel registro; c'è anche un limite per IP.
- **Niente PIN personale sui dispositivi** (decisione del 22-10-2026): il dispositivo abbinato vale da solo come Cassa o Varco sulla sua edizione, senza la schermata "Chi sei?". Le operazioni si registrano a nome del dispositivo; revocarlo dall'admin toglie subito l'accesso. L'annullo di una vendita chiede ancora il PIN di un responsabile.
- **PIN** (responsabili, per approvare gli annulli): PIN di 4–6 cifre (con hash). Dopo 5 errori consecutivi si blocca finché un responsabile non lo reimposta. La sessione PIN scade dopo 30 minuti senza attività.
- **Dettagli e permessi** (decisione del 23-10-2026): prima di generare QR e PIN si sceglie anche a chi è affidato il dispositivo (testo libero e telefono facoltativo), la **cassa** su cui lavora (obbligatoria per una cassa: il telefono non la sceglie) e **cosa può fare**, con i preset *Cassa principale*, *Cassa secondaria* e *Varco* da ritoccare casella per casella:
  - Cassa: vendere (sempre), «Altro» a importo libero (solo se la cassa lo ha acceso), omaggi, annullare vendite senza responsabile (senza la casella serve il PIN di un responsabile), aprire e chiudere il turno, vedere i totali del turno e la Z (senza: chiusura contando alla cieca), ristampare.
  - Varco: scansionare (sempre), annullare un ingresso, vendere all'ingresso (pulsanti a pagamento come «+1 Bambino»), incassare gli ordini «Paga in loco» (`checkin.collect_payment`, spento anche nel preset Varco: senza, l'esito dice «Da pagare in cassa»), cercare per nome (dati personali), vedere i contatori.
  Tutto passa dal QR al dispositivo (`devices.register_id`, `holder_name`, `holder_phone`, `permissions`). Il server controlla che le chiavi siano del ruolo e che la cassa sia dell'edizione, e rifiuta con un 403 in italiano ciò che il dispositivo non può fare; l'app nasconde gli stessi pulsanti. **Modifica** dalla tabella dei dispositivi (Sistema › Utenti › Dispositivi, Cassa › Dispositivi, Check-in › Dispositivi): vale dalla richiesta successiva del telefono, senza un nuovo QR, e finisce nel registro (`device.permissions_changed`, senza il telefono). I dispositivi abbinati prima (`permissions` NULL) valgono come il ruolo Cassiere o Ingresso, come prima.
- **Revocare**: un clic nella tabella dei dispositivi; il dispositivo perde subito l'accesso.
- **Cassa**: dopo l'abbinamento un dispositivo di cassa apre direttamente la nuova cassa `/cassa`. La vecchia `/cashier` resta raggiungibile a mano: anche lì con un dispositivo si entra con nome e PIN; senza dispositivo resta il codice evento finché `site_settings.legacy_event_code` non è `false` (lo spegne il prompt 14).
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
