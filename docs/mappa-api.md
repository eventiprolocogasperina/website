# Mappa delle API (`src/app/api/`)

- **File `route.ts` totali:** 66 (`find src/app/api -name route.ts | wc -l`)
- **Cartelle di primo livello in `src/app/api/`:** 20 (`admin`, `bookings`, `cashier`, `discounts`, `events`, `gallery`, `manuals`, `members`, `news`, `nexi`, `orders`, `refunds`, `reviews`, `setup`, `subscriptions`, `support-topics`, `telegram`, `tickets`, `webhooks`, `zuccaland`)
- **Middleware / proxy:** nessuno (`src/middleware.ts` e `src/proxy.ts` non esistono), quindi nessuna rotta è protetta a monte.

Legenda classificazione:

- **pubblica**: deve restare raggiungibile senza login.
- **cassa/scanner (codice evento)**: usata da cassieri o da chi scansiona i biglietti; va protetta con il codice evento o una sessione cassa.
- **da proteggere**: solo admin.
- **mista**: la classificazione cambia a seconda del metodo (indicata per metodo nella cella).

"Chiamata da" riporta i percorsi relativi a `src/`.

## Protezione (prompt 02)

- `src/proxy.ts`: senza sessione admin, `/admin/**` va a `/login` e `/api/admin/**` risponde 401 (eccetto `GET /api/admin/sponsors`, usata dal sito pubblico).
- Dentro ogni rotta protetta c'è anche `requireAdmin()` (difesa a due livelli).
- Scanner (`/api/tickets/verify`, `unverify`, `/api/orders/add-extra`, `/api/admin/stats`): la pagina scanner è nell'admin, quindi serve la sessione admin, come prima serviva la password.
- Cassa e monitor stand: il codice evento si verifica sul server in `/api/cashier/session`, che apre una sessione di cassa valida 16 ore e solo per quell'evento.

## Permessi (prompt 07)

Ogni rotta protetta chiama una delle funzioni di `src/server/auth/context.ts` con il permesso della matrice del §8.3.
`requirePermission` e `authorize` rispondono 401 senza sessione e 403 senza permesso. I ruoli assegnati a una sola edizione valgono solo
quando la rotta indica quell'edizione: le rotte qui sotto sono ancora "di associazione", quindi servono ruoli sull'associazione
(le versioni per edizione arrivano con i prompt 08–12).

Quando la colonna dice "o", basta uno dei due accessi (es. le statistiche dello scanner: chi legge gli ordini oppure lo scanner con PIN).

| Rotta | Permesso per metodo |
|---|---|
| `/api/admin/cashier/reset-report` | POST: `settings.manage` |
| `/api/admin/cashier/reset-sequence` | POST: `settings.manage` |
| `/api/admin/cashier` | GET: `catalog.edit`; POST: `catalog.edit` |
| `/api/admin/discounts/[id]` | PUT: `catalog.edit`; DELETE: `catalog.edit` |
| `/api/admin/discounts` | GET: `catalog.edit`; POST: `catalog.edit` |
| `/api/admin/orders/archived` | GET: `orders.read`; PATCH: `orders.edit` |
| `/api/admin/orders/create` | POST: `orders.edit` |
| `/api/admin/orders/export-pdf` | POST: `reports.export` |
| `/api/admin/orders/pay-by-link` | POST: `orders.edit` |
| `/api/admin/orders/pay-by-link/send-email` | POST: `orders.resend` |
| `/api/admin/orders` | GET: `orders.read`; PATCH: `orders.edit`; DELETE: `orders.cancel` |
| `/api/admin/orders/send-postponement-email` | POST: `orders.resend` |
| `/api/admin/orders/test` | GET: `settings.manage`; POST: `settings.manage` |
| `/api/admin/orders/thankyou-preview` | GET: `orders.read` |
| `/api/admin/orders/thankyou` | POST: `orders.resend` |
| `/api/admin/orders/zuccaland-time-update` | GET: `orders.read`; POST: `orders.edit` |
| `/api/admin/pages` | GET: `content.edit o editions.edit`; POST: `content.edit o editions.edit` |
| `/api/admin/refunds` | GET: `orders.read`; PATCH: `orders.refund`; DELETE: `orders.refund` |
| `/api/admin/search` | GET: `orders.read` |
| `/api/admin/settings` | GET: `settings.manage`; POST: `settings.manage` |
| `/api/admin/sponsors` | POST: `content.edit`; PUT: `content.edit`; DELETE: `content.edit` |
| `/api/admin/stats` | GET: `orders.read` oppure checkin.scan (scanner con PIN) |
| `/api/admin/upload` | POST: `content.edit o editions.edit` |
| `/api/admin/whatsapp/send-broadcast` | POST: `customers.read` |
| `/api/admin/zuccaland-photos/[id]` | PUT: `photos.moderate` |
| `/api/admin/zuccaland-photos` | GET: `photos.moderate` |
| `/api/admin/zuccaland/invites` | POST: `orders.edit`; GET: `orders.read`; PUT: `orders.edit`; DELETE: `orders.edit` |
| `/api/bookings/[id]` | PUT: `orders.edit`; DELETE: `orders.cancel` |
| `/api/bookings` | GET: `orders.read` |
| `/api/cashier/item-status` | PATCH: pos.sell (cassa: admin, dispositivo+PIN o codice evento) |
| `/api/cashier/orders/[id]` | GET: pos.sell (cassa: admin, dispositivo+PIN o codice evento) |
| `/api/cashier/orders` | POST: pos.sell (cassa: admin, dispositivo+PIN o codice evento); GET: pos.sell (cassa: admin, dispositivo+PIN o codice evento); PATCH: pos.sell (cassa: admin, dispositivo+PIN o codice evento) |
| `/api/cashier/realtime` | GET: pos.sell (cassa: admin, dispositivo+PIN o codice evento) |
| `/api/cashier/session` | GET: pos.sell (cassa: admin, dispositivo+PIN o codice evento) |
| `/api/cashier/stand` | GET: pos.sell (cassa: admin, dispositivo+PIN o codice evento); PATCH: pos.sell (cassa: admin, dispositivo+PIN o codice evento) |
| `/api/cashier/stats` | GET: pos.sell (cassa: admin, dispositivo+PIN o codice evento) |
| `/api/cassa/state`, `/api/cassa/catalog`, `/api/cassa/stream`, `/api/cassa/reparto` | GET (reparto anche POST): pos.sell (dispositivo pos + PIN, oppure admin con `?edizione=`; niente codice evento) |
| `/api/cassa/sales` | POST, GET: pos.sell (idem) |
| `/api/cassa/sales/[id]/void` | POST: pos.sell + PIN di un responsabile con pos.void (dall'admin basta pos.void); limite di tentativi |
| `/api/cassa/sessions`, `/api/cassa/sessions/[id]`, `/api/cassa/sessions/[id]/z` | pos.open_close_session (idem) |
| `/api/cassa/pronti/[edition]` | GET pubblico: solo numeri e reparti, 404 se lo schermo Pronti è spento |
| `/api/admin/cassa/z/[id]` | GET: reports.export (controllato dal servizio) |
| `/api/admin/cassa/[edition]/rendiconto` | GET: reports.export |
| `/api/events/[id]` | PUT: `editions.edit`; DELETE: `editions.archive` |
| `/api/events` | POST: `editions.create` |
| `/api/gallery/[id]` | PUT: `content.edit`; DELETE: `content.edit` |
| `/api/gallery` | POST: `content.edit` |
| `/api/manuals/[type]` | GET: qualunque accesso (admin o PIN) |
| `/api/members/[id]` | PUT: `members.manage`; DELETE: `members.manage` |
| `/api/members` | GET: `members.manage`; POST: `members.manage` |
| `/api/news/[id]` | PUT: `content.edit`; DELETE: `content.edit` |
| `/api/news` | POST: `content.edit` |
| `/api/orders/add-extra` | POST: `orders.edit` oppure checkin.scan (scanner con PIN) |
| `/api/reviews` | GET: `reviews.moderate` |
| `/api/telegram/setup` | GET: `settings.manage` |
| `/api/tickets/qr` | GET: `orders.read` |
| `/api/tickets/stats` | GET: `orders.read` oppure checkin.scan (scanner con PIN) |
| `/api/tickets/unverify` | POST: checkin.revert (scanner: admin o dispositivo+PIN) |
| `/api/tickets/verify` | POST: checkin.scan (scanner: admin o dispositivo+PIN) |
| `/api/zuccaland/alert` | POST: `editions.edit` |

Rotte dello scanner nuovo (prompt 15, `src/app/api/scanner/*`, vedi [check-in.md](check-in.md)): tutte richiedono admin con il permesso oppure dispositivo scanner abbinato + PIN (`requireCheckin`); nessuna restituisce email o telefono.

| Rotta | Permesso |
|---|---|
| `/api/scanner/bootstrap` | GET: checkin.scan |
| `/api/scanner/scan` | POST: checkin.scan | (biglietto dalla ricerca: entra subito)
| `/api/scanner/order` | POST: checkin.scan (QR letto: l'ordine da confermare, non registra niente) |
| `/api/scanner/group` | POST: checkin.scan ("Fai entrare N": biglietti dello stesso ordine, una transazione) |
| `/api/scanner/revert` | POST: checkin.revert (`from`: `ultimo`, `ricerca` o `esito`; il motivo nel registro lo sceglie il server) |
| `/api/scanner/action` | POST: checkin.scan (pulsanti dei moduli, es. "+1 Bambino") |
| `/api/scanner/search` | GET: checkin.scan (nome o codice; niente email/telefono) |
| `/api/scanner/counters` | GET: checkin.scan |
| `/api/scanner/offline` | GET: checkin.scan (solo hash dei QR, niente dati personali) |
| `/api/scanner/sync` | POST: checkin.scan (idempotente su `checkins.client_id`) |

Rotte nuove: `/api/field/session` (stato dell'accesso sul dispositivo, pubblica: non restituisce dati personali oltre ai nomi di chi può entrare su quel dispositivo, e solo a un dispositivo abbinato), `/api/field/pin` (PIN, richiede il dispositivo), `/api/field/logout`, `/api/auth/password-link` (utente dell'admin).

## Riepilogo

| Classificazione | Rotte |
|---|---|---|
| pubblica | 13 |
| cassa/scanner (codice evento) | 11 |
| da proteggere | 33 |
| mista (metodi pubblici + metodi admin) | 9 |
| **Totale** | **66** |

## Tabella delle rotte

### `/api/admin/*`

| Rotta | Metodi | Scopo | Chiamata da (pagina/componente) | Dati personali (legge/scrive/no) | Autenticazione oggi | Classificazione | Protezione (dopo prompt 02) |
|---|---|---|---|---|---|---|---|
| `/api/admin/cashier` | GET, POST | Legge/salva configurazione cassa e statistiche incassi | `app/admin/cassa/page.tsx` | no | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/cashier/reset-report` | POST | Azzera report incassi e ordini cassa di un evento | `app/admin/cassa/page.tsx` | no (cancella ordini cassa) | nessuna (controlla solo che il body contenga `confirmation: "conferma"`, non è un'autenticazione) | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/cashier/reset-sequence` | POST | Reimposta la numerazione progressiva degli ordini cassa | `app/admin/cassa/page.tsx` | no | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/discounts` | GET, POST | Elenca e crea codici sconto | `components/admin/DiscountManager.tsx` | no | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/discounts/[id]` | PUT, DELETE | Modifica / elimina un codice sconto | `components/admin/DiscountManager.tsx` | no | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/search` | GET | Ricerca ordini per la palette ⌘K (codice, nome, email, telefono; max 10) | `components/admin/shell/CommandPalette.tsx` | legge (nome, email) | — (nuova, prompt 06) | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/orders` | GET, PATCH, DELETE | Lista ordini con biglietti; blacklist, modifica dati, segna pagato, reinvio email, cambio data; archiviazione | `components/admin/OrderManager.tsx` | legge/scrive (nome, email, telefono, note) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/orders/archived` | GET, PATCH | Lista ordini archiviati; ripristino | `components/admin/OrderManager.tsx` | legge (nome, email, telefono) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/orders/create` | POST | Crea ordine manuale (pay-by-link o già saldato) e invia email | `components/admin/OrderManager.tsx` | scrive (nome, email, telefono) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/orders/export-pdf` | POST | Genera PDF registro presenze dagli ordini passati nel body | `components/admin/OrderManager.tsx` | legge (nominativi ricevuti nel body e stampati nel PDF) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/orders/pay-by-link` | POST | Crea sotto-ordine di integrazione con link di pagamento Nexi | `components/admin/OrderManager.tsx` | legge/scrive (copia nome, email, telefono dell'ordine padre) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/orders/pay-by-link/send-email` | POST | Invia via email il link di pagamento di un ordine | `components/admin/OrderManager.tsx` | legge (nome, email) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/orders/send-postponement-email` | POST | Invio massivo (o di test) email di rinvio evento Zuccaland | `components/admin/OrderManager.tsx` | legge (nome, email di tutti gli acquirenti) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/orders/test` | GET, POST | Debug: GET risponde `ok`; POST crea un ordine di test PAGATO, invia email e Telegram | `components/admin/OrderManager.tsx` | scrive (email e telefono hardcoded o dal body) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/orders/thankyou` | POST | Invio massivo email di ringraziamento post-evento | `components/admin/OrderManager.tsx` | legge (nome, email) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/orders/thankyou-preview` | GET | Anteprima HTML dell'email di ringraziamento | `app/admin/email-preview/page.tsx` | no (dati fittizi) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/orders/zuccaland-time-update` | GET, POST | Riepilogo ordini Zuccaland; reinvio massivo biglietti con orario aggiornato | `components/admin/OrderManager.tsx` | legge (nome, email, telefono) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/pages` | GET, POST | Legge / salva il contenuto CMS di una pagina (`slug`) | `app/admin/pagine/zuccaland/page.tsx`, `app/admin/pagine/associazione/page.tsx`, `app/admin/pagine/archiviate/assaggia-2026/page.tsx` | no | nessuna | mista: **GET pubblica** (contenuto pubblico, oggi letto solo dall'admin), **POST da proteggere** | admin (proxy + requireAdmin) |
| `/api/admin/refunds` | GET, PATCH, DELETE | Lista, aggiornamento stato e cancellazione richieste di rimborso | `components/admin/RefundManager.tsx` | legge/scrive (nome, email, telefono, intestatario, IBAN) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/settings` | GET, POST | Legge / salva tutte le `site_settings` | `app/admin/impostazioni/page.tsx` | no (ma restituisce segreti: `wa_access_token`, `wa_webhook_verify_token`) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/sponsors` | GET, POST, PUT, DELETE | CRUD sponsor | `app/admin/pagine/sponsor/page.tsx`, `components/ui/SponsorsMarquee.tsx` | no | nessuna | mista: **GET pubblica** (usata dal marquee pubblico), **POST/PUT/DELETE da proteggere** | GET pubblica; POST/PUT/DELETE admin (proxy + requireAdmin) |
| `/api/admin/stats` | GET | Statistiche biglietti per evento | `app/admin/scanner/page.tsx` | no (aggregati) | nessuna | cassa/scanner (codice evento) | admin (proxy + requireAdmin) |
| `/api/admin/upload` | POST | Upload file (immagini/PDF) su Cloudinary | `components/admin/ImageUpload.tsx`, `app/admin/pagine/archiviate/assaggia-2026/page.tsx` | no | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/whatsapp/send-broadcast` | POST | Invio massivo (o di test) messaggi WhatsApp via Meta Graph API | `components/admin/OrderManager.tsx` | legge (nome, telefono) | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/zuccaland-photos` | GET | Lista di tutte le foto Zuccaland (anche in attesa/rifiutate) | `app/admin/zuccaland-photos/AdminZuccalandPhotos.tsx` | no | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/zuccaland-photos/[id]` | PUT | Approva / rifiuta una foto | `app/admin/zuccaland-photos/AdminZuccalandPhotos.tsx` | no | nessuna | da proteggere | admin (proxy + requireAdmin) |
| `/api/admin/zuccaland/invites` | GET, POST, PUT, DELETE | Crea inviti omaggio con email e QR, lista, reinvio, cancellazione | `app/admin/zuccaland-inviti/page.tsx` | legge/scrive (nome, email, telefono) | nessuna | da proteggere | admin (proxy + requireAdmin) |

### Rotte pubbliche, contenuti e operazioni

| Rotta | Metodi | Scopo | Chiamata da (pagina/componente) | Dati personali (legge/scrive/no) | Autenticazione oggi | Classificazione | Protezione (dopo prompt 02) |
|---|---|---|---|---|---|---|---|
| `/api/bookings` | GET, POST | GET lista prenotazioni; POST nuova prenotazione evento | `components/events/BookingForm.tsx` (POST), `components/admin/BookingManager.tsx` (GET) | GET legge, POST scrive (nome, cognome, email, telefono) | nessuna | mista: **POST pubblica**, **GET da proteggere** | POST pubblica; GET admin (requireAdmin) |
| `/api/bookings/[id]` | PUT, DELETE | Check-in/stato prenotazione; cancellazione | `components/admin/BookingManager.tsx` | scrive (modifica/cancella prenotazioni nominative) | nessuna | da proteggere | admin (requireAdmin) |
| `/api/discounts/apply` | POST | Verifica un codice sconto e ne restituisce i dati | `app/zuccaland/ZuccalandClient.tsx` | no | nessuna | pubblica | pubblica |
| `/api/events` | GET, POST | Lista eventi (anche `?filter=upcoming`); creazione evento | `app/admin/eventi/page.tsx`, `app/admin/page.tsx`, `app/admin/analytics/page.tsx` +1 | no | nessuna | mista: **GET pubblica** (oggi chiamata solo dall'admin), **POST da proteggere** | GET pubblica; POST admin (requireAdmin) |
| `/api/events/[id]` | GET, PUT, DELETE | Dettaglio evento per id o slug; modifica; cancellazione | `components/admin/EventForm.tsx`, `app/admin/eventi/page.tsx` | no | nessuna | mista: **GET pubblica**, **PUT/DELETE da proteggere** | GET pubblica; PUT/DELETE admin (requireAdmin) |
| `/api/gallery` | GET, POST | Lista galleria (seed automatico se vuota); aggiunta immagine | `app/media/page.tsx`, `app/assaggia-e-passeggia/page.tsx`, `app/eventi/la-baguette-da-record-2026/page.tsx` +2 | no | nessuna | mista: **GET pubblica**, **POST da proteggere** | GET pubblica; POST admin (requireAdmin) |
| `/api/gallery/[id]` | PUT, DELETE | Modifica / elimina immagine galleria | `app/admin/media/page.tsx`, `components/admin/GalleryForm.tsx` | no | nessuna | da proteggere | admin (requireAdmin) |
| `/api/manuals/[type]` | GET | Genera PDF guida scanner o cassa | nessuno trovato | no | nessuna | da proteggere | admin (requireAdmin) |
| `/api/members` | GET, POST | Lista soci; creazione socio dal pannello | `app/admin/soci/page.tsx`, `components/admin/MemberForm.tsx`, `app/admin/page.tsx` +1 | legge/scrive (nome, cognome, email) | nessuna | da proteggere (la POST è chiamata solo da `MemberForm` admin; l'iscrizione pubblica passa da `/api/subscriptions`) | admin (requireAdmin) |
| `/api/members/[id]` | PUT, DELETE | Modifica / elimina socio | `components/admin/MemberForm.tsx`, `app/admin/soci/page.tsx` | scrive (nome, cognome, email) | nessuna | da proteggere | admin (requireAdmin) |
| `/api/news` | GET, POST | Lista news; creazione news | `app/admin/notizie/page.tsx`, `components/admin/NewsForm.tsx` | no | nessuna | mista: **GET pubblica** (oggi chiamata solo dall'admin), **POST da proteggere** | GET pubblica; POST admin (requireAdmin) |
| `/api/news/[id]` | PUT, DELETE | Modifica / elimina news | `components/admin/NewsForm.tsx`, `app/admin/notizie/page.tsx` | no | nessuna | da proteggere | admin (requireAdmin) |
| `/api/nexi/callback` | GET | Ritorno da Nexi: segna l'ordine pagato, unisce le integrazioni, invia biglietti e Telegram, redirect | nessuno trovato nel frontend (URL passato a Nexi da `app/api/nexi/checkout/route.ts`) | legge (nome, email, telefono, inviati via email e Telegram) | verifica MAC SHA1 sui parametri (`codTrans`, `esito`, `importo`, `divisa`, `data`, `orario`, `codAut`) con `NEXI_MAC_KEY`; fallback hardcoded `'YOUR_SECRET_MAC_KEY'` se la variabile manca | pubblica | MAC SHA1 con NEXI_MAC_KEY, senza chiave di ripiego |
| `/api/nexi/checkout` | GET | Pagina HTML auto-submit verso Nexi con MAC calcolato | `app/zuccaland/ZuccalandClient.tsx`, `app/paga/[id]/PayLinkClient.tsx` | legge l'ordine ma espone solo importo e ID | nessuna (basta `orderId`) | pubblica | pubblica |
| `/api/orders` | POST | Creazione ordine pubblico (controllo capienza Zuccaland, Telegram, email se gratuito) | `app/zuccaland/ZuccalandClient.tsx` | scrive (nome, email, telefono) | nessuna | pubblica | pubblica |
| `/api/orders/add-extra` | POST | Aggiunge un extra pagato all'ingresso (importo e note) a un ordine | `app/admin/scanner/page.tsx` | no (modifica importo e note di un ordine) | nessuna | cassa/scanner (codice evento) | admin (requireAdmin) |
| `/api/refunds` | POST | Richiesta pubblica di rimborso con IBAN, con notifica Telegram | `app/zuccaland/rimborso/RefundClient.tsx` | scrive (nome, email, telefono, intestatario, IBAN) | nessuna (solo validazione campi e IBAN) | pubblica | pubblica |
| `/api/reviews` | GET, POST | POST nuova recensione; GET tutte le recensioni (filtro opzionale `eventId`) | `app/assaggia-e-passeggia/page.tsx` (POST), `app/admin/recensioni/page.tsx` (GET) | POST scrive, GET legge (nome facoltativo) | nessuna | mista: **POST pubblica**, **GET da proteggere** (oggi restituisce tutte le recensioni: non esiste uno stato "approvata", quindi non c'è una GET pubblica di sole recensioni approvate) | POST pubblica; GET admin (requireAdmin) |
| ~~`/api/setup`~~ | — | **Rimossa nel prompt 04**: lo schema si gestisce con le migrazioni in `drizzle/` | — | — | — | — | — |
| `/api/subscriptions` | POST | Iscrizione socio: genera PDF e invia 2 email via Resend (associazione + richiedente) | `app/iscriviti/page.tsx` | legge dal body e invia via email (nome, cognome, luogo/data di nascita, residenza, indirizzo, codice fiscale, cellulare, email); non salva su DB | nessuna | pubblica | pubblica |
| `/api/support-topics` | GET | Argomenti e numero WhatsApp per il widget di supporto (riscrive `site_settings` se il numero è diverso) | `components/ui/WhatsAppWidget.tsx` | no | nessuna | pubblica | pubblica |
| `/api/telegram/setup` | GET | Registra il webhook Telegram via API `setWebhook` | nessuno trovato | no | nessuna | da proteggere | admin (requireAdmin); solo in produzione (VERCEL_ENV); registra secret_token |
| `/api/telegram/webhook` | POST | Bot Telegram: comandi statistiche e ultimi ordini | nessuno trovato (chiamata da Telegram, URL registrato da `app/api/telegram/setup/route.ts`) | legge (nomi acquirenti e importi nel comando `/ordini`) | nessuna firma: l'header `X-Telegram-Bot-Api-Secret-Token` non è verificato; risponde solo se `message.chat.id === TELEGRAM_CHAT_ID` (valore nel body, falsificabile) | pubblica (deve richiedere l'header segreto) | header X-Telegram-Bot-Api-Secret-Token = TELEGRAM_WEBHOOK_SECRET |
| `/api/tickets/download` | GET | PDF dei biglietti di un ordine pagato | `app/zuccaland/success/ZuccalandSuccessClient.tsx`, `app/paga/[id]/PayLinkClient.tsx`, `app/assaggia-e-passeggia/edizione-2026/success/SuccessClient.tsx` +1 | legge (nome, email e QR nel PDF) | nessuna (basta `orderId`; controlla solo `status === 'PAID'`) | pubblica | pubblica |
| `/api/tickets/qr` | GET | Genera un PNG QR da qualsiasi stringa `data`/`code` | nessuno trovato | no | nessuna | da proteggere | admin (requireAdmin) |
| `/api/tickets/stats` | GET | Statistiche biglietti per `eventId` | `app/admin/page.tsx`, `app/admin/analytics/page.tsx` | no (aggregati) | nessuna | da proteggere | admin (requireAdmin) |
| `/api/tickets/unverify` | POST | Annulla il check-in di un biglietto | `app/admin/scanner/page.tsx` | no | nessuna | cassa/scanner (codice evento) | admin (requireAdmin) |
| `/api/tickets/verify` | POST | Convalida biglietto da QR / ID; ricerca anche per nome o email | `app/admin/scanner/page.tsx` | legge (restituisce nome, email, telefono degli ordini trovati) | nessuna | cassa/scanner (codice evento) | admin (requireAdmin) |
| `/api/webhooks/whatsapp` | GET, POST | GET: verifica del webhook Meta; POST: riceve eventi e li logga | nessuno trovato (chiamata da Meta; URL mostrato in `app/admin/impostazioni/page.tsx`) | POST: possibile (logga l'intero payload Meta, che può contenere numeri e messaggi) | GET: verifica `hub.mode === 'subscribe'` e `hub.verify_token` (da DB, `WHATSAPP_VERIFY_TOKEN` o fallback hardcoded `'proloco_whatsapp_webhook_secret_2026'`); POST: nessuna firma (`X-Hub-Signature-256` non verificata) | pubblica (la POST deve richiedere la firma Meta) | GET: verify token senza valore di ripiego; POST: firma X-Hub-Signature-256 con WHATSAPP_APP_SECRET |
| `/api/zuccaland/alert` | GET, POST | GET: stato del banner di rinvio meteo; POST: aggiorna il banner | `app/zuccaland/ZuccalandClient.tsx` (GET), `components/admin/OrderManager.tsx` (GET, POST) | no | nessuna | mista: **GET pubblica**, **POST da proteggere** | GET pubblica; POST admin (requireAdmin) |
| `/api/zuccaland/availability` | GET | Disponibilità e sold-out per data Zuccaland | `app/admin/pagine/zuccaland/page.tsx` | no | nessuna | pubblica | pubblica |
| `/api/zuccaland/photos` | GET | Foto Zuccaland approvate (galleria pubblica) | `app/zuccaland/galleria/ZuccalandGalleryClient.tsx` | no | nessuna | pubblica | pubblica |
| `/api/zuccaland/upload` | POST | Upload pubblico di una foto su Cloudinary, salvata come `pending` | `app/zuccaland/photo/ZuccalandPhotoClient.tsx` | no (immagine caricata dall'utente) | nessuna (solo controllo tipo immagine e limite di 15 MB) | pubblica | pubblica |

### `/api/cashier/*` (cassa e stand)

| Rotta | Metodi | Scopo | Chiamata da (pagina/componente) | Dati personali (legge/scrive/no) | Autenticazione oggi | Classificazione | Protezione (dopo prompt 02) |
|---|---|---|---|---|---|---|---|
| `/api/cashier/session` | POST | Login cassa: trova l'evento dal codice e ne restituisce la configurazione | `app/cashier/CashierClient.tsx` | no | confronta `eventCode` nel body con `config.events[].eventCode` e richiede `active`; nessun token di sessione restituito | cassa/scanner (codice evento) | pubblica: verifica il codice evento sul server e apre la sessione di cassa (cookie pl_cassa) |
| `/api/cashier/item-status` | PATCH | Segna un piatto come disponibile o esaurito | `app/cashier/CashierClient.tsx` | no | nessuna (solo `eventId` nel body) | cassa/scanner (codice evento) | sessione di cassa dello stesso evento o admin |
| `/api/cashier/orders` | GET, POST, PATCH | Crea ordine cassa con QR della ricevuta; lista ultimi 50; storno | `app/cashier/CashierClient.tsx`, `app/cashier/stand/StandClient.tsx` | no (nome operatore) | nessuna | cassa/scanner (codice evento) | sessione di cassa dello stesso evento o admin |
| `/api/cashier/orders/[id]` | GET | Dettaglio ricevuta cassa | nessuno trovato (la pagina `app/ricevuta/[id]` legge direttamente dal DB) | no | nessuna | cassa/scanner (codice evento) | sessione di cassa dello stesso evento o admin |
| `/api/cashier/realtime` | GET | Stream SSE degli eventi cassa (ordini, stati, reset) | `app/cashier/stand/StandClient.tsx` | no (contenuto degli ordini cassa) | nessuna | cassa/scanner (codice evento) | sessione di cassa dello stesso evento o admin |
| `/api/cashier/stand` | GET, PATCH | Comande per reparto; aggiornamento stato di preparazione | `app/cashier/stand/StandClient.tsx` | no | nessuna | cassa/scanner (codice evento) | sessione di cassa dello stesso evento o admin |
| `/api/cashier/stats` | GET | Statistiche incassi per evento, cassa e data | `app/cashier/CashierClient.tsx` | no | nessuna | cassa/scanner (codice evento) | sessione di cassa dello stesso evento o admin |

## Note

**Nessuna autenticazione:** non c'è middleware o proxy e nessun handler verifica una sessione admin. L'unico controllo simile a un'autenticazione è `eventCode` in `/api/cashier/session`, che però non restituisce un token: tutte le altre rotte `/api/cashier/*` sono aperte a chiunque conosca un `eventId`.

**Rotte di debug e test:**

- `/api/admin/orders/test` (POST) crea un ordine **PAGATO** reale nel DB, con email `vono.niccolo@gmail.com` e telefono `+393505757501` hardcoded (o un'email arbitraria passata nel body). Poi invia i biglietti via email e una notifica Telegram. Chiunque può usarla per spedire biglietti validi a un indirizzo a scelta.
- `/api/admin/orders/thankyou-preview` è un'anteprima email con dati fittizi.
- `/api/setup` esegue DDL ed è chiamata a ogni caricamento di `app/admin/page.tsx`.

**DDL e scritture dentro rotte di lettura:**

- `/api/setup` (GET) esegue `CREATE TABLE IF NOT EXISTS` (gallery, bookings, news, orders, tickets, pages_content, discounts, sponsors, site_settings), `ALTER TABLE ... ADD COLUMN` su events, orders e discounts, e un seed di `site_settings`.
- `/api/admin/orders` (GET) esegue `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "isBlacklisted"...` a ogni chiamata. Lo stesso ALTER si ripete nel PATCH `TOGGLE_BLACKLIST`, tramite `toggleOrderBlacklist` in `src/lib/data/tickets.ts`.
- Le rotte cassa passano da `src/lib/data/cashier.ts`, che esegue `CREATE TABLE IF NOT EXISTS cashier_orders` e un `ALTER TABLE`.
- `/api/gallery` (GET) scrive nel DB (seed con gli elementi statici) se la tabella è vuota.
- `/api/support-topics` (GET) riscrive `site_settings.whatsapp_topics` se il numero non è `393505757501`.

**Invio di messaggi (email, WhatsApp, Telegram):**

- Invii email massivi via Resend, tutti senza autenticazione:
  - `/api/admin/orders/send-postponement-email` (`sendMode: 'broadcast'`)
  - `/api/admin/orders/thankyou`
  - `/api/admin/orders/zuccaland-time-update` (`confirmBroadcast: true`)
- `/api/admin/whatsapp/send-broadcast` invia messaggi WhatsApp a tutti gli acquirenti tramite Meta Graph API, usando l'access token salvato in `site_settings`.
- Altre email singole:
  - `/api/admin/orders/create`, `/api/admin/orders/pay-by-link/send-email`, `/api/admin/zuccaland/invites` (POST e PUT)
  - `/api/admin/orders` (PATCH `MARK_PAID`, `RESEND_EMAIL`, `CHANGE_EVENT_DATE`)
  - `/api/orders` (ordini gratuiti), `/api/nexi/callback`
- `/api/subscriptions` invia 2 email con un PDF di dati anagrafici completi, compreso il codice fiscale. Essendo pubblica e senza limiti di frequenza, chiunque può far partire email verso indirizzi arbitrari.
- Notifiche Telegram con nome, email e telefono degli acquirenti:
  - `/api/orders`, `/api/nexi/callback`, `/api/admin/orders/create`, `/api/admin/orders/pay-by-link`, `/api/admin/orders` (cambio data), `/api/admin/orders/test`
  - `/api/refunds`, che **invia l'IBAN in chiaro** su Telegram.

**Servizi esterni:**

- Cloudinary: `/api/admin/upload` (upload senza autenticazione in qualsiasi cartella, PDF compresi) e `/api/zuccaland/upload`.
- Telegram: `/api/telegram/setup` può reimpostare il webhook del bot; l'URL è preso dall'header `Host` della richiesta.
- Meta: `/api/admin/whatsapp/send-broadcast`.
- Nexi: `/api/nexi/checkout` e `/api/nexi/callback`.

**Segreti e fallback deboli:**

- `/api/admin/settings` (GET) restituisce a chiunque tutte le `site_settings`, compresi `wa_access_token` e il verify token del webhook WhatsApp.
- `/api/nexi/callback` usa `'YOUR_SECRET_MAC_KEY'` come chiave MAC se `NEXI_MAC_KEY` non è impostata.
- `/api/webhooks/whatsapp` usa il verify token hardcoded `'proloco_whatsapp_webhook_secret_2026'`.

**Webhook:**

- `/api/telegram/webhook` non verifica l'header `X-Telegram-Bot-Api-Secret-Token`. L'unico filtro è `chat.id` nel body, che un attaccante può impostare: chi conosce il chat ID ottiene statistiche e nomi degli ultimi ordini, inviati alla chat admin.
- `/api/webhooks/whatsapp` (POST) non verifica la firma `X-Hub-Signature-256` e logga l'intero payload.

**Integrità dei pagamenti:**

- `/api/orders` accetta `totalAmount`, i prezzi del `cart` e il `discountId` così come arrivano dal client, senza ricalcolarli sul server. L'importo poi addebitato da Nexi (`/api/nexi/checkout`) è quello salvato nell'ordine, quindi è manipolabile.
- `/api/orders/add-extra` modifica `totalAmount` e note di qualsiasi ordine senza autenticazione.
- `/api/tickets/verify` permette di cercare ordini per nome o email parziali e restituisce nome, email e telefono.

**Chiamanti nel namespace sbagliato:**

- `components/ui/SponsorsMarquee.tsx` (pubblico) chiama `/api/admin/sponsors`, che restituisce anche gli sponsor inattivi. Conviene una GET pubblica separata, filtrata su `active`.
- `/api/admin/stats` sta sotto `admin` ma è usata dalla pagina scanner.
- `/api/zuccaland/availability` è classificata pubblica, ma oggi la chiama solo `app/admin/pagine/zuccaland/page.tsx`; `ZuccalandClient` non la usa.
- `/api/events`, `/api/events/[id]`, `/api/news` e `/api/admin/pages` (GET) servono contenuti pubblici, ma oggi le chiama solo l'admin: le pagine pubbliche leggono i dati lato server.
- `/api/members` (POST) è la creazione socio dal pannello admin. L'iscrizione pubblica ("member signup") è `/api/subscriptions`.

**Nessun chiamante trovato:** `/api/manuals/[type]`, `/api/tickets/qr`, `/api/cashier/orders/[id]`, `/api/telegram/setup`. I webhook `/api/nexi/callback`, `/api/telegram/webhook` e `/api/webhooks/whatsapp` li chiamano solo i servizi esterni.
