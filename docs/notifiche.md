# Notifiche, email e pagine di Sistema (prompt 18)

## Telegram allo staff

Handler degli eventi di dominio in `src/server/domain/notifications/handlers.ts` (registrati da `src/server/notifications/handlers.ts`, che i servizi importano). Partono solo dagli ordini del nucleo nuovo: le rotte di oggi (Zuccaland 2026 in vendita) mandano ancora i loro messaggi finché esistono.

| Tipo (`editions.notification_settings`) | Evento | Testo |
|---|---|---|
| `orderPaid` | `order.paid` (non per il canale `pos`) | codice, biglietti, totale, canale |
| `paymentProblem` | `payment.failed`, `payment.amount_mismatch` | codice e importi |
| `refundRequested` | `refund.requested` | codice e importo |
| `cashDifference` | `cash.session_closed` con differenza ≠ 0 | cassa, numero Z, atteso, contato |

Chiave assente = attiva. Si cambiano in Sistema → Notifiche (le edizioni archiviate non si toccano). Mai nomi, email, telefoni (§18.11): i testi sono in `messages.ts`, testati.

Chat: quella degli avvisi è `telegram_alert_chat_id` (site_settings) o, se vuota, `TELEGRAM_CHAT_ID`. Il client (`src/server/integrations/telegram.ts`) chiama l'API solo con `TELEGRAM_BOT_TOKEN`; i test usano `setTelegramClient`.

### Comandi del bot

`/api/telegram/webhook` (segreto `TELEGRAM_WEBHOOK_SECRET`) accetta solo `TELEGRAM_CHAT_ID`, la chat degli avvisi e le chat in `telegram_allowed_chats`. Comandi generici (`bot.ts`): `/edizioni`, `/stats <edizione>`, `/ordini <edizione>`, `/aiuto` (slug esatto o parte del nome, la più recente). I comandi di oggi restano invariati e vengono prima: `/stats` e `/ordini` senza argomento, `/stats …zucca…`, `/statszuccaland`, `/zuccalandperdata`… Quando le rotte di oggi spariranno, `/stats` senza argomento potrà diventare "edizione in corso".

### Allarmi di errore

`log.error` → `alerts.ts` (registrato in `src/instrumentation.ts`, perché `log.ts` finisce anche in bundle client): un messaggio alla chat degli avvisi al massimo ogni 10 minuti per tipo (testo del log + codice/nome dell'errore), contato tra le istanze con la tabella `alert_throttle`. Nel messaggio solo il testo fisso, campi tecnici (`code`, `event`, `edition`, `status`…) e il link `ALERT_LOGS_URL` (pagina Logs del progetto su Vercel; default la dashboard).

## Email

- Modelli: `src/server/domain/email-templates/defaults.ts` (conferma, rinvio, ringraziamento, pay-link, aggiornamento rimborso, "Avvisami"). Le versioni modificate stanno in `email_templates` (globale con `edition_id` NULL, oppure per edizione, che vince). Testo con paragrafi, `**grassetto**` e `{{variabili}}` dell'elenco; tutto escapato (`render.ts`).
- Inviati oggi dal sistema nuovo: **conferma** (`sendOrderTickets`, anche "Reinvia biglietti") e **rinvio** (modulo Rinvio per maltempo). Gli altri hanno testo, anteprima e invio di prova, e aspettano il loro flusso.
- Le email del flusso di oggi di Zuccaland (`src/lib/tickets/*EmailDocument.tsx`, `sendTicketsEmail.ts`…) non sono cambiate.
- Registro: ogni email da un modello passa da `sendLoggedEmail` → `email_log` (indirizzo mascherato, modello, oggetto, esito e ID di Resend; `outbox` in sviluppo).
- Admin: `/admin/sistema/email` (elenco e "Registro invii"), `/admin/sistema/email/[key]?edizione=…` (editor, anteprima con un ordine scelto, invio di prova a sé, ripristino). Sostituisce `/admin/email-preview` (redirect in `next.config.ts`).

## WhatsApp (modulo `broadcast`)

- Credenziali: `WHATSAPP_ACCESS_TOKEN` (o il token salvato dalle impostazioni di prima, finché c'è), Phone Number ID in Sistema → Notifiche o `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` per la firma del webhook.
- Modelli approvati: elenco in Sistema → Notifiche (nome, lingua, testo con `{{1}}`…, variabili per ogni parametro).
- Invio: `/admin/e/<edizione>/m/broadcast` (pagina "Messaggi"): modello, data, ingresso → "Calcola i destinatari" (numero e testo d'esempio) → conferma. `sendWhatsappBroadcast` rifà il conto (se cambia: CONFLICT), è idempotente sul `requestId`, scrive `whatsapp_broadcasts` e `whatsapp_messages` (codice ordine e numero mascherato).
- Webhook `/api/webhooks/whatsapp`: firma HMAC verificata, aggiorna lo stato dei messaggi (solo in avanti), non logga più il corpo.

## Pagine di Sistema (modello SettingsPage, `src/components/admin/settings/`)

- `impostazioni`: associazione, social, SEO predefinita, argomenti di supporto (`whatsapp_topics`), avviso di rinvio della pagina Zuccaland di oggi (`zuccaland_postponed_*`). Sostituisce `/admin/impostazioni` (redirect).
- `pagamenti`: alias, ambiente, chiave MAC solo "impostata/mancante"; "Pagamento di prova da 1 €" (codTrans `PROVA…`, ritorno su `/api/pagamenti/nexi/prova`, non tocca ordini).
- `notifiche`: Telegram, avvisi per edizione, WhatsApp, testi del rinvio delle pagine di oggi (`wa_*`, `email_postponement_*`).

Impostazioni in `site_settings`, una chiave per campo, servizio `src/server/domain/settings`. I segreti non passano mai da lì.
