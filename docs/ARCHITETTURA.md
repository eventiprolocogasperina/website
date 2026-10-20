# ARCHITETTURA.md — File madre del sito Pro Loco Gasperina

> **Per l'agente che legge questo file.** Questo documento è la fonte di verità su architettura, modello dati, gerarchia, stile e regole del progetto. Va letto **per intero prima di ogni attività**. Se una richiesta contraddice questo file, fermati e chiedi conferma a Niccolo prima di procedere. Quando una decisione cambia, aggiorna questo file nella stessa PR, aggiungendo una riga al Registro decisioni (§19).
>
> Versione 1.1, 18 ottobre 2026. Base di codice analizzata: commit `444c7d6`.

---

## Indice

1. [Visione e principi](#1-visione-e-principi)
2. [Glossario](#2-glossario)
3. [Stack e vincoli tecnici](#3-stack-e-vincoli-tecnici)
4. [Struttura delle cartelle](#4-struttura-delle-cartelle)
5. [Modello dati](#5-modello-dati)
6. [Livello di dominio (servizi)](#6-livello-di-dominio-servizi)
7. [Sistema a moduli](#7-sistema-a-moduli)
8. [Autenticazione, ruoli e permessi](#8-autenticazione-ruoli-e-permessi)
9. [Ciclo di vita di un'edizione](#9-ciclo-di-vita-di-unedizione)
10. [Architettura dell'area admin](#10-architettura-dellarea-admin)
11. [Modelli di pagina dell'admin](#11-modelli-di-pagina-delladmin)
12. [App da campo: cassa e scanner](#12-app-da-campo-cassa-e-scanner)
13. [Sito pubblico: gerarchia e URL](#13-sito-pubblico-gerarchia-e-url)
14. [Design system](#14-design-system)
15. [Testi, lingua e formati](#15-testi-lingua-e-formati)
16. [Convenzioni di codice](#16-convenzioni-di-codice)
17. [Qualità e definizione di "fatto"](#17-qualità-e-definizione-di-fatto)
18. [Regole invariabili](#18-regole-invariabili)
19. [Registro decisioni](#19-registro-decisioni)
20. [Domande aperte](#20-domande-aperte)

---

## 1. Visione e principi

Il sito ha due anime:
- un **sito pubblico** che racconta l'associazione e i suoi eventi;
- un'**area admin** che è il *cervello* di tutto il sistema. Gestisce eventi, vendite online, cassa, ingressi, contenuti e soci.

**Principi architetturali**, in ordine di priorità:

1. **Nucleo comune, moduli per evento.** Ordini, pagamenti, rimborsi, catalogo, capienze, check-in e clienti funzionano allo stesso modo per ogni evento. Le esigenze specifiche (fasce orarie, laboratori, tappe, foto, inviti) sono **moduli** che si attivano sulla singola edizione (§7). Il nucleo non contiene mai codice del tipo `if (eventId === 'zuccaland')`.
2. **Una sola fonte di verità.** Ogni dato vive in un solo posto. Un panino venduto in cassa e un biglietto comprato online sono entrambi *ordini*, con canali diversi.
3. **Il server comanda.** Prezzi, sconti, totali, capienze e permessi si calcolano e si verificano sempre sul server. Il browser invia solo *cosa* e *quanti*.
4. **Tutto è tracciato.** Ogni azione che modifica ordini, pagamenti, capienze o permessi scrive una riga nel registro attività.
5. **Configurazione, non codice.** Un nuovo evento si crea dall'admin, senza scrivere codice. Anche un'edizione nuova di un format esistente non richiede codice.
6. **Pensato per chi lo usa.** I volontari lavorano in piazza dal telefono, l'amministratore lavora dal computer. Ogni schermata è progettata per il suo utente reale.

Riferimenti di qualità: **Pretix** (modello dati di biglietteria, sotto-eventi, quote, liste di check-in, plugin), **Shopify Admin e Polaris** (gerarchia admin, modelli di pagina, tono), **Shopify POS, Square e SumUp** (cassa, turni, chiusura Z), **Eventbrite** (serie di eventi e date multiple), **Linear** (ricerca e command palette, densità, rapidità).

---

## 2. Glossario

Usa sempre questi termini, sia nel codice (in inglese, tra parentesi) sia nell'interfaccia (in italiano).

| Termine (UI) | Codice | Definizione |
|---|---|---|
| Format | `series` | L'evento ricorrente: Zuccaland, Assaggia e Passeggia, Baguette da Record. Ha una pagina pubblica stabile. |
| Edizione | `edition` | Un'istanza datata di un format (Zuccaland 2026). Un evento singolo è un'edizione senza format. |
| Data / Fascia | `session` | Un momento con data, orario e capienza (Dom 25 ott, 10:30). Un'edizione ha da 1 a N sessioni. |
| Prodotto | `product` | Qualcosa che si vende o si assegna: biglietto, extra, cibo, bevanda, merch, donazione. |
| Quota | `quota` | Capienza condivisa tra prodotti e/o sessioni ("max 300 ingressi per fascia"). |
| Ordine | `order` | Un acquisto o un'assegnazione, su qualunque canale. |
| Riga d'ordine | `order_line` | Un prodotto dentro un ordine, con prezzo applicato. Può generare biglietti. |
| Biglietto | `ticket` | Una riga con QR, verificabile allo scanner. |
| Pagamento | `payment` | Un movimento di denaro in entrata legato a un ordine. |
| Rimborso | `refund` | Un movimento in uscita legato a un ordine. |
| Canale | `channel` | `online`, `pos` (cassa), `paylink`, `invite`, `admin`. |
| Turno di cassa | `cash_session` | Apertura → vendite → chiusura Z di una cassa. |
| Lista di check-in | `checkin_list` | Un punto di controllo (Ingresso, Laboratorio, Tappa 3). |
| Modulo | `module` | Una funzione opzionale attivata su un'edizione (§7). |
| Cliente | `customer` | La persona che acquista, identificata dall'email. |
| Socio | `member` | Un iscritto all'associazione. È un'entità distinta dal cliente. |
| Operatore | `user` | Chi accede all'admin o alle app da campo. |

---

## 3. Stack e vincoli tecnici

| Area | Scelta | Note |
|---|---|---|
| Framework | **Next.js 16.2** (App Router), React 19.2 | ⚠️ È diverso da quello che conosci. Prima di scrivere codice leggi le guide in `node_modules/next/dist/docs/` (regola di `AGENTS.md`). In Next 16 `middleware.ts` si chiama `proxy.ts`. |
| Linguaggio | TypeScript `strict` | Vietato `any`. Usa `unknown` più validazione. |
| Database | Neon Postgres (`@neondatabase/serverless`) | In sviluppo usa sempre un **branch Neon di sviluppo**, mai la produzione. |
| ORM e migrazioni | **Drizzle ORM + drizzle-kit** | Schema in `src/server/db/schema/`, migrazioni versionate in `drizzle/`. Vietati `ALTER TABLE` e `CREATE TABLE` a runtime. |
| Validazione | **zod** (già installato) | Ogni input del server passa da uno schema zod. |
| Stile admin | **Tailwind CSS v4** (già installato) + token CSS (§14) | Vietati gli oggetti `style={{…}}` nei nuovi componenti admin. |
| Primitive UI accessibili | **Radix UI** (`@radix-ui/react-*`) | Dialog, DropdownMenu, Popover, Tabs, Tooltip, Select, Switch. |
| Tabelle | **TanStack Table v8** | Ordinamento, filtri, selezione multipla, colonne configurabili. |
| Command palette | **cmdk** | Ricerca globale Ctrl/⌘ + K. |
| Form | react-hook-form (già installato) + zod resolver | |
| Grafici | Recharts | Solo nell'admin. |
| Date | date-fns (già installato), fuso `Europe/Rome` | |
| Email | Resend + React Email (già installati) | |
| PDF | @react-pdf/renderer (già installato) | Rimuovi `jspdf` quando non serve più. |
| Pagamenti | Nexi XPay | Verifica del MAC obbligatoria, callback idempotente. |
| Immagini | Cloudinary | |
| Test | **Vitest** (dominio), **Playwright** (end-to-end) | |
| Hosting | **Vercel** | Anteprima automatica per ogni PR, variabili d'ambiente per ambiente (Preview e Production), Vercel Cron per i lavori periodici (es. `expirePendingOrders`). |
| Monitoraggio errori | **Log di Vercel + allarmi Telegram** | Nessun servizio esterno aggiuntivo. Gli errori gravi (pagamento fallito, importo che non corrisponde, eccezioni nei servizi di dominio) inviano un messaggio Telegram alla chat admin, **senza dati personali**. |

**Dipendenze nuove** fuori da questa lista: chiedi prima di aggiungerle.

---

## 4. Struttura delle cartelle

Struttura **target**. Le cartelle esistenti si spostano gradualmente, una PR per volta.

```
src/
├── app/
│   ├── (public)/                 # sito pubblico, layout con Navbar e Footer
│   │   ├── page.tsx              # home
│   │   ├── eventi/               # calendario e /eventi/[slug] (edizioni senza pagina dedicata)
│   │   ├── zuccaland/            # pagina del format + [anno]/ archivio
│   │   ├── assaggia-e-passeggia/ # pagina del format + [anno]/ + tappa/[id]
│   │   ├── notizie/ … contatti/ trasparenza/ privacy/
│   │   └── i-miei-biglietti/[token]/
│   ├── (checkout)/acquista/[edition]/  # flusso d'acquisto unico
│   ├── admin/                    # area admin (§10)
│   │   ├── (org)/…               # livello associazione
│   │   └── e/[edition]/…         # livello edizione
│   ├── cassa/                    # app da campo cassa (§12)
│   ├── scanner/                  # app da campo scanner (§12)
│   ├── login/
│   └── api/                      # solo webhook e endpoint per dispositivi (Nexi, Telegram, WhatsApp, realtime)
├── server/                       # codice SOLO server ("server-only")
│   ├── db/{client.ts, schema/}
│   ├── auth/{session.ts, permissions.ts, pin.ts}
│   ├── domain/                   # servizi di dominio (§6)
│   │   ├── catalog/  pricing/  quotas/  orders/  payments/  refunds/
│   │   ├── checkin/  cash/  customers/  audit/  editions/  notifications/
│   └── integrations/{nexi, resend, telegram, whatsapp, cloudinary}/
├── modules/                      # moduli per edizione (§7)
│   ├── registry.ts
│   ├── time-slots/  activities/  postponement/  invites/
│   ├── visitor-photos/  route-stops/  departments/  reviews/  free-booking/  landing-page/
├── components/
│   ├── ui/                       # primitive del design system (§14)
│   ├── admin/                    # componenti composti dell'admin (shell, tabelle, pannelli)
│   ├── public/                   # componenti del sito pubblico e blocchi di pagina
│   └── field/                    # componenti delle app cassa e scanner
├── lib/                          # utilità pure, condivise tra client e server (format, money, dates)
└── styles/tokens.css             # token del design system
drizzle/                          # migrazioni SQL generate
scripts/                          # script una tantum (backfill, seed di sviluppo)
tests/{unit, e2e}/
docs/ARCHITETTURA.md              # questo file
```

**Regola**: `src/server/**` importa `server-only`. I componenti client non importano mai da `src/server/`.

---

## 5. Modello dati

### 5.1 Convenzioni

- Tabelle e colonne in `snake_case` inglese. I tipi TypeScript in `camelCase`, generati da Drizzle.
- Chiave primaria `id uuid` (v7 dove possibile). Ogni tabella ha `created_at` e `updated_at` (`timestamptz`).
- **Importi in centesimi**, come `integer` (`price_cents`). Mai `float`, mai `decimal` letto come `number`.
- Gli stati sono `enum` Postgres.
- Le cancellazioni sono logiche (`deleted_at`) per ordini, clienti e soci. Fisiche solo per bozze mai pubblicate.
- Le colonne JSONB servono solo per le impostazioni dei moduli (validate con zod), mai per dati da interrogare o contare.
- I dati personali sensibili (IBAN) si cifrano a livello applicativo.

### 5.2 Schema

```
series                (format)
  id, slug UNIQUE, name, description, landing_path, theme jsonb, created_at…

editions              (edizione)
  id, series_id → series NULL, slug UNIQUE, year, title, subtitle,
  status edition_status, starts_at, ends_at, location, cover_image,
  timezone default 'Europe/Rome', public_page_mode ('generic'|'landing'),
  enabled_modules text[], module_settings jsonb, concluded_at, archived_at

sessions              (data / fascia)
  id, edition_id, label, starts_at, ends_at, capacity NULL,
  status ('open'|'closed'|'sold_out'|'cancelled'|'postponed'), sort

products
  id, edition_id, kind product_kind, name, description, emoji/icon,
  price_cents, vat_rate NULL, channels text[] ('online','pos','paylink','invite'),
  requires_session bool, issues_ticket bool, checkin_list_ids uuid[],
  department NULL, active bool, sort, min_per_order, max_per_order

quotas
  id, edition_id, name, size, session_id NULL
quota_products        (quota_id, product_id)          -- n:m
  -- la disponibilità di un prodotto è il minimo tra le quote a cui appartiene

discounts
  id, edition_id NULL, code UNIQUE, kind ('percent'|'fixed'), value,
  max_uses, used_count, valid_from, valid_until, applies_to_product_ids uuid[], active

customers
  id, email UNIQUE (lowercase), name, phone, marketing_consent, consent_at, notes

orders
  id, code UNIQUE (leggibile: "ZK26-7F3K"), edition_id, customer_id,
  channel order_channel, status order_status, session_id NULL,
  subtotal_cents, discount_cents, total_cents, discount_id NULL,
  cash_session_id NULL, operator_id NULL, device_id NULL,
  access_token (per "I miei biglietti"), is_blacklisted, blacklist_reason,
  expires_at (per PENDING online), created_at, paid_at, cancelled_at

order_lines
  id, order_id, product_id, session_id NULL, quantity, unit_price_cents,
  discount_cents, total_cents, department NULL, prep_status NULL

tickets
  id, order_line_id, edition_id, session_id NULL, qr_token UNIQUE,
  attendee_name NULL, status ('valid'|'void')

checkin_lists
  id, edition_id, name, product_ids uuid[], allow_multiple bool
checkins
  id, ticket_id, checkin_list_id, at, operator_id, device_id, reverted_at NULL

attendee_answers      (modulo activities)
  id, order_id, ticket_id NULL, question_key, value jsonb

payments
  id, order_id, method ('nexi'|'cash'|'card_pos'|'complimentary'|'bank_transfer'),
  amount_cents, status ('pending'|'succeeded'|'failed'),
  provider_ref UNIQUE NULL, raw jsonb, received_at, cash_session_id NULL

refunds
  id, order_id, amount_cents, reason, method, status ('requested'|'approved'|'paid'|'rejected'),
  iban_encrypted NULL, holder_name, requested_at, processed_at, processed_by

cash_registers        (casse: "Cassa 1", "Bar")
  id, edition_id, name, product_ids uuid[] NULL, printer_settings jsonb
cash_sessions
  id, register_id, opened_by, opened_at, opening_float_cents,
  closed_by, closed_at, counted_cash_cents, expected_cash_cents, difference_cents,
  z_report_number, notes

users                 (operatori)
  id, email UNIQUE NULL, name, password_hash NULL, pin_hash NULL, active,
  last_login_at, totp_secret NULL
role_assignments
  id, user_id, role user_role, edition_id NULL   -- NULL = tutta l'associazione
devices               (tablet e telefoni autorizzati per cassa e scanner)
  id, name, token_hash, edition_id, kind ('pos'|'scanner'), revoked_at

audit_log
  id, at, actor_user_id NULL, actor_device_id NULL, action, entity_type, entity_id,
  edition_id NULL, before jsonb, after jsonb, reason NULL, ip

email_templates
  id, key ('order_confirmation','postponement','thank_you','paylink','refund_update'),
  edition_id NULL (override), subject, body_mdx, updated_by

page_blocks           (pagine dedicate a blocchi)
  id, owner_type ('series'|'edition'|'page'), owner_id, block_type, props jsonb, sort, visible

members, news, gallery_items, sponsors, reviews, site_settings, transparency_documents
```

### 5.3 Enum

```
edition_status: draft | published | on_sale | sold_out | live | concluded | archived | suspended
order_status:   pending | paid | partially_refunded | refunded | cancelled | expired
order_channel:  online | pos | paylink | invite | admin
product_kind:   ticket | addon | food | drink | merch | donation | service
user_role:      owner | admin | event_manager | editor | cashier | gate
```

### 5.4 Regole di integrità

- `orders.total_cents = subtotal_cents - discount_cents`, ricalcolato **solo** dal servizio `pricing`.
- La somma dei `payments.succeeded` meno la somma dei `refunds.paid` determina lo stato di pagamento. È sempre derivata, mai impostata a mano.
- La capienza si controlla **dentro una transazione**, con `SELECT … FOR UPDATE` sulle quote coinvolte. Un ordine `pending` occupa posto fino a `expires_at` (15 minuti online).
- Le scorte dei prodotti di cassa sono quote: lo stesso meccanismo, nessun caso speciale.
- Un'edizione `archived` è in sola lettura. I servizi rifiutano scritture con l'errore `EDITION_ARCHIVED`.

### 5.5 Da dove si parte (stato attuale da migrare)

| Oggi | Diventa |
|---|---|
| tabella `events` | `editions` (più `series` per i format) |
| JSON `pages_content['zuccaland']` (`ticketTypes`, `dateLimits`) | `products`, `sessions`, `quotas`, `page_blocks` |
| JSON della cassa in `pages_content` (`CashierConfig`) | `cash_registers`, `products` (canale `pos`), `quotas` |
| `orders` + `tickets` (online) | `orders` / `order_lines` / `tickets` / `payments` |
| `cashier_orders` | `orders` con `channel = 'pos'` |
| testo in `orders.notes` letto da `parseOrderNotes()` | `orders.session_id`, `attendee_answers`, `audit_log`, ordini collegati per le integrazioni |
| ID fissi `'zuccaland-2026'`, `'assaggia-passeggia'`, `'baguette26'`… | `editions.id` (lo slug resta solo per gli URL) |
| `bookings` (prenotazioni gratuite) | `orders` a 0 € con il modulo `free-booking` |

---

## 6. Livello di dominio (servizi)

Tutta la logica di business vive in `src/server/domain/`. Pagine, Server Actions e route handler sono **sottili**: autenticano, validano con zod, chiamano un servizio e restituiscono il risultato.

Ogni funzione di servizio che modifica dati segue questa forma:

```ts
export async function refundOrder(ctx: Ctx, input: RefundOrderInput): Promise<Result<Refund>> {
  // 1. permesso
  await requirePermission(ctx, 'orders.refund', { editionId })
  // 2. validazione
  const data = RefundOrderInput.parse(input)
  // 3. transazione
  return db.transaction(async (tx) => {
    // 4. regole di dominio (edizione non archiviata, importo ≤ pagato, …)
    // 5. scrittura
    // 6. audit log
    await audit(tx, ctx, 'order.refunded', { before, after, reason })
    // 7. eventi per i moduli e le notifiche (dopo il commit)
  })
}
```

- `Ctx` contiene l'utente o il dispositivo, i ruoli e l'IP. Non esiste un servizio che lavori senza `Ctx`.
- Gli errori di dominio sono tipizzati (`DomainError` con un `code`). L'interfaccia mostra il messaggio italiano associato al codice.
- **Pricing**: `priceCart(editionId, lines, discountCode?, channel)` è l'**unica** funzione che calcola gli importi. La usano checkout, cassa, pay-link e admin.
- **Eventi di dominio**: `order.paid`, `order.refunded`, `ticket.checked_in`, `session.postponed`, `edition.concluded`… I moduli e le notifiche (Telegram, email, WhatsApp) si iscrivono a questi eventi invece di essere chiamati direttamente.

---

## 7. Sistema a moduli

Un modulo aggiunge funzioni a un'edizione **senza toccare il nucleo**. È il modello dei plugin di Pretix.

```ts
// src/modules/types.ts
export interface EditionModule<S extends z.ZodTypeAny> {
  key: string                       // 'time-slots'
  name: string                      // 'Fasce orarie'
  description: string
  settingsSchema: S                 // impostazioni in editions.module_settings[key]
  dependsOn?: string[]
  admin?: {
    nav?: AdminNavItem[]            // voci sotto "Moduli" nella scheda edizione
    orderPanels?: OrderPanel[]      // riquadri nella pagina di dettaglio ordine
    orderActions?: OrderAction[]    // azioni nel menu "Altre azioni" dell'ordine
    dashboardWidgets?: Widget[]
    closingChecks?: ClosingCheck[]  // controlli per la checklist di chiusura (§9)
  }
  checkout?: { steps?: CheckoutStep[]; validate?: (cart, ctx) => Promise<void> }
  pos?: { actions?: PosAction[] }
  scanner?: { actions?: ScannerAction[] }   // es. "+1 Bambino" oggi cablato nello scanner
  public?: { blocks?: BlockDefinition[] }
  on?: Partial<Record<DomainEventName, Handler>>
}
```

**Catalogo dei moduli**:

| Chiave | Nome | Cosa fa | Sostituisce oggi |
|---|---|---|---|
| `time-slots` | Fasce orarie | scelta della sessione nel checkout, capienza per fascia | `dateLimits`, `dayKey` in `notes` |
| `activities` | Attività e laboratori | bambini, attività gratuite per giorno con i loro posti, laboratorio a pagamento, altre domande | bambini e attività in `notes` |
| `postponement` | Rinvio per maltempo | giornata rinviata alla data di recupero, email ai clienti, avviso sul sito, rimborso al secondo rinvio | `[SPOSTAMENTO DATA…]` in `notes`, `send-postponement-email` |
| `invites` | Inviti e omaggi | invio in blocco di biglietti a 0 € con canale `invite` | `/admin/zuccaland-inviti` |
| `visitor-photos` | Foto dei visitatori | caricamento pubblico, moderazione, galleria | `zuccaland_photos`, `/admin/zuccaland-photos` |
| `route-stops` | Percorso a tappe | tappe con mappa, menu e QR stabile per tappa | tappe di A&P in `pages_content` |
| `departments` | Reparti e comande | reparti, comande stampate, schermo cucina | `enableDepartments`, `departmentStatuses` |
| `reviews` | Recensioni | raccolta e moderazione delle recensioni dell'edizione | `/api/reviews` con `eventId` fisso |
| `free-booking` | Prenotazione gratuita | iscrizione senza pagamento con capienza | `bookings`, `BookingForm` |
| `landing-page` | Pagina dedicata | pagina a blocchi sotto il percorso del format | `ZuccalandClient.tsx`, pagine A&P |
| `paylink` | Pagamento con link | ordini creati dall'admin e pagati via link | `/admin/orders/pay-by-link` |
| `broadcast` | Messaggi ai partecipanti | invio WhatsApp ed email a un segmento | `/api/admin/whatsapp/send-broadcast` |

**Regole dei moduli**:
- Un modulo legge e scrive solo attraverso i servizi di dominio, o tramite le proprie tabelle con il prefisso `mod_<key>_`.
- Un modulo si attiva e si disattiva dalla scheda "Impostazioni → Moduli" dell'edizione. Disattivarlo non cancella mai i dati.
- `src/modules/registry.ts` è l'unico punto in cui i moduli vengono registrati.

---

## 8. Autenticazione, ruoli e permessi

### 8.1 Accesso

- **Admin**: `/login` con email e password (hash argon2id o bcrypt), più TOTP facoltativo per `owner` e `admin`. La sessione è un cookie `httpOnly`, `Secure`, `SameSite=Lax` e firmato, con durata di 12 ore. Il logout la invalida sul server.
- **App da campo** (cassa e scanner):
  - il dispositivo viene autorizzato una sola volta dall'admin, tramite un QR di abbinamento che genera un `device token`;
  - poi ogni volontario entra con il proprio **PIN di 4–6 cifre**;
  - le sessioni del PIN scadono dopo 30 minuti di inattività;
  - un dispositivo si revoca dall'admin in un clic.
- **Clienti**: nessun account. Accedono a "I miei biglietti" tramite il link firmato ricevuto per email (`access_token`).

### 8.2 Difesa a due livelli

1. `src/proxy.ts` blocca `/admin/**` e `/api/admin/**` senza sessione, e `/cassa` e `/scanner` senza dispositivo.
2. **Ogni servizio** richiama di nuovo `requirePermission`. Il proxy da solo non basta mai.

Le variabili `NEXT_PUBLIC_*` non contengono mai segreti.

### 8.3 Ruoli e permessi

Un ruolo si assegna sull'**associazione** (`edition_id NULL`) o su una **singola edizione**.

| Permesso | owner | admin | event_manager¹ | editor | cashier¹ | gate¹ |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `users.manage`, `settings.payments` | ✔ | — | — | — | — | — |
| `settings.manage`, `audit.read` | ✔ | ✔ | — | — | — | — |
| `editions.create` / `editions.archive` | ✔ | ✔ | — | — | — | — |
| `editions.edit`, `catalog.edit`, `modules.manage` | ✔ | ✔ | ✔ | — | — | — |
| `orders.read` (con dati personali) | ✔ | ✔ | ✔ | — | — | — |
| `orders.edit`, `orders.cancel`, `orders.resend` | ✔ | ✔ | ✔ | — | — | — |
| `orders.refund` | ✔ | ✔ | ✔² | — | — | — |
| `refunds.view_iban` | ✔ | ✔ | — | — | — | — |
| `customers.read`, `members.manage` | ✔ | ✔ | — | — | — | — |
| `content.edit` (notizie, galleria, pagine, sponsor, trasparenza sui dati) | ✔ | ✔ | — | ✔ | — | — |
| `photos.moderate`, `reviews.moderate` | ✔ | ✔ | ✔ | ✔ | — | — |
| `pos.sell`, `pos.open_close_session` | ✔ | ✔ | ✔ | — | ✔ | — |
| `pos.void` (richiede PIN di un responsabile) | ✔ | ✔ | ✔ | — | — | — |
| `checkin.scan`, `checkin.revert` | ✔ | ✔ | ✔ | — | — | ✔ |
| `reports.export` | ✔ | ✔ | ✔ | — | — | — |

¹ Limitati alle edizioni assegnate. ² Fino a una soglia configurabile; sopra la soglia serve `admin`.

L'interfaccia **nasconde** ciò che l'utente non può fare. Il server lo **rifiuta** comunque.

---

## 9. Ciclo di vita di un'edizione

```
draft ─▶ published ─▶ on_sale ─▶ (sold_out) ─▶ live ─▶ concluded ─▶ archived
                         │                                ▲
                         └──────▶ suspended ──────────────┘
```

| Stato | Sito pubblico | Vendita online | Cassa / Scanner | Admin |
|---|---|---|---|---|
| `draft` | invisibile (anteprima con link firmato) | no | no | tutto modificabile |
| `published` | visibile, "Biglietti presto disponibili" + "Avvisami" | no | no | |
| `on_sale` | visibile, acquisto aperto | sì | prove | |
| `sold_out` | automatico quando le quote sono piene | lista d'attesa (facoltativa) | sì | |
| `live` | "In corso oggi" | configurabile | sì | modalità "Giorno dell'evento" in evidenza |
| `concluded` | pagina "Grazie" con galleria e recensioni | no | no | **checklist di chiusura** |
| `archived` | pagina d'archivio `/<format>/<anno>` | no | no | **sola lettura** |
| `suspended` | messaggio di sospensione o rinvio | no | no | |

**Dichiarare un'edizione conclusa** (decisione di Niccolo): è un'azione esplicita dell'admin, non automatica.

**Checklist di chiusura**: il pulsante "Archivia" si abilita solo quando ogni controllo è ✔, oppure quando un `owner` o `admin` lo salta con una motivazione, che viene registrata. I controlli del nucleo sono:
1. tutti i turni di cassa sono chiusi e le differenze sono giustificate;
2. non ci sono ordini `pending`;
3. tutte le richieste di rimborso sono chiuse;
4. il rendiconto finale (PDF e CSV) è stato generato.

I moduli aggiungono i propri controlli, per esempio "foto moderate" o "email di ringraziamento inviata".

Quando un'edizione viene archiviata, se `series.landing_path` puntava a questa edizione, la pagina del format torna in modalità "fuori stagione" (§13).

---

## 10. Architettura dell'area admin

### 10.1 Due livelli

L'admin ha **due livelli**, come Shopify (negozio) e Pretix (organizzatore ed evento):

- **Associazione**: tutto ciò che vale per l'associazione intera.
- **Edizione**: tutto ciò che riguarda un'edizione specifica, scelta con il **selettore di edizione** nella barra in alto.

### 10.2 Shell

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ☰  [logo] Pro Loco Gasperina   ▸ [ 🎃 Zuccaland 2026 · In vendita  ▾ ]    │
│                                   🔍 Cerca ordini, clienti, pagine…  ⌘K   │
│                                                     🔔 3   ◐   [N ▾]       │
├───────────────────────┬────────────────────────────────────────────────────┤
│ SIDEBAR               │  Breadcrumb: Zuccaland 2026 › Ordini › ZK26-7F3K   │
│ (cambia col livello)  │  ┌──────────────────────────────────────────────┐  │
│                       │  │ Titolo pagina             [Azione secondaria]│  │
│                       │  │ sottotitolo / stato       [Azione primaria]  │  │
│                       │  ├──────────────────────────────────────────────┤  │
│                       │  │ contenuto (modelli di pagina §11)            │  │
│                       │  └──────────────────────────────────────────────┘  │
└───────────────────────┴────────────────────────────────────────────────────┘
```

- **Selettore di edizione**: elenca le edizioni attive in alto, poi "Tutte le edizioni…" e "+ Nuova edizione". La scelta resta in un cookie e determina la sidebar del livello Edizione. "Pro Loco Gasperina" riporta al livello Associazione.
- **Ricerca globale ⌘K**: cerca ordini (codice, nome, email, telefono, QR), clienti, edizioni, notizie e soci, e offre comandi rapidi ("Nuovo ordine", "Apri cassa", "Vai a Impostazioni").
- **Campanella**: le cose da fare (rimborsi da gestire, foto da moderare, ordini pending scaduti, errori di pagamento).
- **Menu utente**: profilo, cambio password, tema chiaro/scuro, esci.
- **Mobile**: la sidebar diventa un cassetto. Le tabelle diventano liste di schede. Le azioni primarie restano in una barra fissa in basso.

### 10.3 Mappa completa delle rotte

**Livello Associazione**

| Sidebar | Rotta | Contenuto | Permesso |
|---|---|---|---|
| **Panoramica** | `/admin` | prossima edizione in evidenza, "Da fare", incassi della stagione per edizione, ultime attività | qualunque ruolo admin |
| **Edizioni** | `/admin/edizioni` | elenco con filtri per stato e format, "+ Nuova edizione" (da zero, da format o duplicando un'edizione) | `editions.*` |
| | `/admin/format` | format (Zuccaland, A&P…): nome, slug, tema, pagina fuori stagione | `editions.edit` |
| **Vendite** | `/admin/ordini` | tutti gli ordini di tutte le edizioni, con filtro per edizione | `orders.read` |
| | `/admin/rimborsi` | tutte le richieste di rimborso | `orders.refund` |
| | `/admin/sconti` | codici sconto globali | `catalog.edit` |
| **Clienti** | `/admin/clienti`, `/admin/clienti/[id]` | anagrafica, storico ordini, consensi | `customers.read` |
| **Associazione** | `/admin/soci` | soci, quote, esportazione libro soci | `members.manage` |
| **Sito** | `/admin/sito/notizie` | notizie | `content.edit` |
| | `/admin/sito/galleria` | galleria generale | |
| | `/admin/sito/pagine` | Chi siamo, Scopri Gasperina, Contatti, Privacy (a blocchi) | |
| | `/admin/sito/sponsor` | sponsor e livelli | |
| | `/admin/sito/trasparenza` | trasparenza sui dati: fornitori che trattano dati, finalità, tempi di conservazione, cookie (§13.6) | |
| | `/admin/sito/navigazione` | voci di menu e footer | |
| **Sistema** | `/admin/sistema/utenti` | operatori, ruoli, PIN, dispositivi | `users.manage` |
| | `/admin/sistema/pagamenti` | configurazione Nexi, modalità test | `settings.payments` |
| | `/admin/sistema/email` | modelli email con anteprima | `settings.manage` |
| | `/admin/sistema/notifiche` | Telegram, WhatsApp, argomenti di supporto | |
| | `/admin/sistema/impostazioni` | dati dell'associazione, social, SEO | |
| | `/admin/sistema/registro` | registro attività filtrabile | `audit.read` |

**Livello Edizione** (`/admin/e/[edition]/…`)

| Sidebar | Rotta | Contenuto |
|---|---|---|
| **Panoramica** | `…/` | stato e prossima azione ("Apri le vendite", "Dichiara conclusa"), KPI (venduto, incassato, check-in, capienza residua per sessione), grafico vendite nel tempo, widget dei moduli |
| **Date e capienze** | `…/date` | sessioni, capienze, quote, stato di ogni sessione |
| **Catalogo** | `…/catalogo` | prodotti per tipo, prezzi, canali, quote, sconti dell'edizione |
| **Ordini** | `…/ordini`, `…/ordini/[code]` | ordini dell'edizione (§11.2) |
| **Partecipanti** | `…/partecipanti` | biglietti e persone, risposte alle domande, stato del check-in, esportazione registro presenze |
| **Check-in** | `…/check-in` | liste di check-in, statistiche in tempo reale, abbinamento dispositivi scanner |
| **Cassa** | `…/cassa` | casse, prodotti per cassa, stampanti, turni aperti e chiusi, chiusure Z, abbinamento dispositivi POS |
| **Rimborsi** | `…/rimborsi` | rimborsi dell'edizione |
| **Statistiche** | `…/statistiche` | vendite per canale, prodotto, sessione e giorno; cassa per ora; confronto con l'edizione precedente |
| **Pagina pubblica** | `…/pagina` | editor a blocchi con anteprima (modulo `landing-page`) o scheda evento generica |
| **Moduli** ▸ | `…/m/[module]/…` | una voce per ogni modulo attivo (Fasce orarie, Inviti, Foto, Tappe…) |
| **Impostazioni** | `…/impostazioni` | dati generali, stato e ciclo di vita, moduli attivi, email, pagamenti, **Chiusura e archivio** |

**App da campo** (fuori dalla shell admin): `/cassa`, `/scanner` (§12).

### 10.4 Redirect dalle rotte attuali

| Rotta attuale | Nuova rotta |
|---|---|
| `/admin/eventi` | `/admin/edizioni` |
| `/admin/notizie` | `/admin/sito/notizie` |
| `/admin/media` | `/admin/sito/galleria` |
| `/admin/recensioni` | `/admin/e/[edition]/m/reviews` (oppure l'elenco globale) |
| `/admin/ordini` | `/admin/ordini` (nuova versione) |
| `/admin/zuccaland-inviti` | `/admin/e/zuccaland-2026/m/invites` |
| `/admin/zuccaland-photos` | `/admin/e/zuccaland-2026/m/visitor-photos` |
| `/admin/cassa` | `/admin/e/[edition]/cassa` |
| `/admin/rimborsi` | `/admin/rimborsi` |
| `/admin/prenotazioni` | `/admin/e/[edition]/partecipanti` (con il flag `orders_v2`; prima resta la pagina di oggi) |
| `/admin/sconti` | `/admin/sconti` |
| `/admin/pagine/zuccaland` | `/admin/e/zuccaland-2026/pagina` |
| `/admin/pagine/sponsor` | `/admin/sito/sponsor` |
| `/admin/pagine/associazione` | `/admin/sito/pagine` |
| `/admin/pagine/archiviate/assaggia-2026` | `/admin/e/assaggia-e-passeggia-2026` (archiviata) |
| `/admin/analytics` | `/admin` e `…/statistiche` |
| `/admin/impostazioni` | `/admin/sistema/impostazioni` |
| `/admin/email-preview` | `/admin/sistema/email` |
| `/admin/scanner` | `/scanner` |

### 10.5 Pagina di dettaglio ordine (la più importante)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ← Ordini   ZK26-7F3K   [Pagato] [Online]       [Reinvia biglietti] [⋯ ▾] │
│ 12 ott 2026, 18:42 · Zuccaland 2026 · Dom 25 ott 10:30                    │
├──────────────────────────────────────────────┬────────────────────────────┤
│ RIGHE                                        │ CLIENTE                    │
│  2 × Ingresso ordinario        € 10,00       │  Mario Rossi               │
│  1 × You Pick Lab              €  3,00       │  mario@… · +39 …           │
│  Sconto FAMIGLIA10            −€  1,30       │  3 ordini · Vedi scheda →  │
│  Totale                        € 11,70       │                            │
├──────────────────────────────────────────────┤ PAGAMENTI                  │
│ BIGLIETTI                                    │  Nexi  € 11,70  ✔ 12 ott   │
│  #1 Ingresso  ✔ entrato 10:41 (Ingresso)     │                            │
│  #2 Ingresso  — non entrato                  │ RIMBORSI                   │
│  #3 You Pick  — non entrato                  │  nessuno                   │
├──────────────────────────────────────────────┤                            │
│ [riquadri dei moduli]                        │ NOTE INTERNE               │
│  Domande: bambini 2 (4 e 7 anni)             │  [aggiungi nota]           │
│  Rinvio: spostato da Sab 10 → Dom 25         │                            │
├──────────────────────────────────────────────┴────────────────────────────┤
│ CRONOLOGIA (registro attività dell'ordine, dal più recente)               │
│  14 ott 09:12  Niccolo ha spostato la data (Sab 10 → Dom 25) · email ✔   │
│  12 ott 18:43  Pagamento Nexi riuscito · € 11,70                          │
│  12 ott 18:42  Ordine creato online                                       │
└───────────────────────────────────────────────────────────────────────────┘
Menu ⋯: Modifica cliente · Aggiungi integrazione (pay-link) · Rimborsa · Annulla ·
        Blacklist · Scarica PDF · [azioni dei moduli: Sposta data…]
```

---

## 11. Modelli di pagina dell'admin

Ogni pagina admin usa **uno** di questi modelli. Non si inventano layout nuovi.

### 11.1 Elenco (`ListPage`)
`PageHeader` (titolo, contatore, azione primaria) → `FilterBar` (ricerca testuale con debounce di 300 ms, filtri a chip, **viste salvate** come tab) → `DataTable` (colonne ordinabili, selezione multipla, larghezza ridimensionabile, colonne mostrabili e nascoste) → `BulkActionBar` (appare quando selezioni, fissa in basso) → paginazione lato server (50 righe).
I filtri sono nell'URL (`?stato=pagato&sessione=…`), così sono condivisibili e il tasto "indietro" funziona.

### 11.2 Dettaglio (`DetailPage`)
`PageHeader` con badge di stato, azione primaria e menu "⋯" → due colonne: **principale** (2/3, il contenuto) e **laterale** (1/3, metadati e relazioni) → **Cronologia** in fondo. Su mobile, una sola colonna con la laterale dopo la principale.

### 11.3 Modulo di modifica (`FormPage`)
Sezioni a schede (`Card`) con titolo e descrizione a sinistra e campi a destra (stile Polaris "annotated section") → **barra di salvataggio contestuale** fissa in alto, che appare quando ci sono modifiche ("Modifiche non salvate · Annulla · Salva") → avviso se esci con modifiche non salvate. La validazione zod condivisa tra client e server, con errori sotto il campo.

### 11.4 Impostazioni (`SettingsPage`)
Navigazione verticale delle sezioni a sinistra e `FormPage` a destra.

### 11.5 Panoramica (`DashboardPage`)
Riga di `Stat` (4 al massimo) → riquadro **"Da fare"** con azioni dirette → grafici → attività recente.

### 11.6 Stati obbligatori per ogni pagina
- **Caricamento**: skeleton con la forma del contenuto, mai uno spinner a tutta pagina.
- **Vuoto**: illustrazione o icona, una frase e un'azione ("Nessun ordine ancora. Condividi il link della pagina.").
- **Errore**: un messaggio in italiano, "Riprova", e il codice errore piccolo per il supporto.
- **Permesso negato**: "Non hai accesso a questa sezione. Chiedi a un amministratore."

### 11.7 Interazioni
- **Azioni distruttive** (annulla, rimborsa, archivia, elimina): `ConfirmDialog` che spiega la conseguenza. Per gli importi sopra 100 € o per l'archiviazione, va digitato il codice o il nome per confermare.
- **Feedback**: `Toast` in basso a destra, "Annulla" per 5 secondi dove è possibile.
- **Aggiornamenti ottimistici** solo per le azioni reversibili (es. segna come letto). Mai per pagamenti e rimborsi.
- **Scorciatoie**: `⌘K` ricerca, `/` focus sulla ricerca dell'elenco, `g o` vai a Ordini, `n` nuovo elemento, `Esc` chiudi il pannello.
- **Pannelli laterali** (`Sheet`) per modifiche rapide senza lasciare l'elenco, come modificare un prodotto dal catalogo.

---

## 12. App da campo: cassa e scanner

Sono app **mobile-first** a schermo intero, senza la shell admin, installabili come PWA.

### 12.1 Cassa (`/cassa`)
1. Il dispositivo è abbinato → il volontario inserisce il PIN → sceglie la cassa (se ce n'è più di una) → **apre il turno** dichiarando il fondo cassa.
2. **Schermata di vendita**: griglia di prodotti per categoria (pulsanti grandi, almeno 64 px), carrello a destra o in basso, totale grande. Pagamento in contanti (con calcolo del resto), carta POS oppure omaggio (con motivo).
3. Dopo la vendita: stampa dello scontrino e delle comande per reparto (ESC/POS via Bluetooth, già presente in `src/lib/printer/`), con il numero dell'ordine grande.
4. **Prodotti esauriti** in tempo reale su tutte le casse, perché le scorte sono quote.
5. **Annullo**: richiede il PIN di un responsabile e un motivo, e viene registrato.
6. **Chiusura turno**: conteggio dei contanti per taglio → sistema e contato a confronto → differenza → **chiusura Z** in PDF, stampabile.
7. **Offline**: se la rete cade, gli ordini vengono salvati in IndexedDB con un ID generato dal client (idempotente) e sincronizzati al ritorno della connessione. Un banner "Offline · 3 ordini da sincronizzare" resta visibile.

### 12.2 Schermo cucina (`/cassa/reparto/[department]`)
Comande del reparto in colonne PENDING → PREPARING → READY → DELIVERED, aggiornate in tempo reale. Uno schermo pubblico facoltativo mostra "Pronti: 42, 43, 47".

### 12.3 Scanner (`/scanner`)
1. Dispositivo abbinato → PIN → scelta della **lista di check-in** (Ingresso, Laboratorio…).
2. Inquadratura del QR → esito a **tutto schermo**: verde "VALIDO" (nome, prodotto, sessione), giallo "GIÀ ENTRATO alle 10:41", rosso "NON VALIDO / altra data / annullato". Accompagnato da vibrazione e suono.
3. "Annulla ultimo check-in" resta disponibile per 30 secondi.
4. Le azioni dei moduli (es. "+1 Bambino" del modulo `activities`) compaiono come pulsanti sotto l'esito. Non sono cablate nello scanner.
5. Ricerca manuale per nome o codice, per chi non ha il QR.
6. Contatori in alto: entrati e attesi per la sessione corrente.

---

## 13. Sito pubblico: gerarchia e URL

### 13.1 Navigazione (decisione di Niccolo)

```
Home · Scopri Gasperina · Notizie · Eventi ▾ · Galleria · Chi siamo · Sponsor · Contatti   [Diventa socio]
                                    ├ Calendario
                                    ├ Zuccaland
                                    └ Assaggia e Passeggia
```
La Baguette da Record **non** compare nel menu: resta nel calendario.

Il footer contiene solo pagine esistenti. La pagina Trasparenza (sul trattamento dei dati, §13.6) è inclusa. "Diventa volontario" e "Sostienici" sono escluse finché non hanno contenuti.

### 13.2 URL

| URL | Contenuto |
|---|---|
| `/eventi` | calendario: prossime edizioni e archivio, con filtri per categoria e mese |
| `/eventi/[slug]` | scheda generica, **solo** per edizioni con `public_page_mode = 'generic'`. Con `landing` → redirect 308 alla pagina del format o dell'edizione |
| `/zuccaland` | pagina del format: edizione in corso se è `published`, `on_sale` o `live`, altrimenti pagina "fuori stagione" |
| `/zuccaland/2026` | pagina dell'edizione (attiva o archiviata) |
| `/assaggia-e-passeggia`, `/assaggia-e-passeggia/2026` | come sopra |
| `/assaggia-e-passeggia/tappa/[id]` | **URL stabile dei QR stampati**: risolve la tappa dell'edizione più recente che la contiene |
| `/acquista/[edition]` | checkout unico |
| `/i-miei-biglietti/[token]` | biglietti, PDF, cambio data e richiesta di rimborso (se i moduli lo consentono) |
| `/trasparenza` | trasparenza sul trattamento dei dati personali (§13.6) |

**Redirect permanenti obbligatori**: `/assaggia-e-passeggia/edizione-2026/*` → `/assaggia-e-passeggia/2026/*`, `/eventi/la-baguette-da-record-2026` → `/eventi/baguette-da-record-2026` (se lo slug cambia), `/zuccaland/success` → `/acquista/…/conferma`. Nessun URL già condiviso deve dare 404.

### 13.3 Pagina del format fuori stagione
Hero con il logo del format → "Cos'è" → numeri dell'ultima edizione → galleria e recensioni delle edizioni passate → elenco "Edizioni passate" (con link a `/<format>/<anno>`) → "Prossima edizione" (data se nota) con iscrizione "Avvisami" (email e consenso) → sponsor.

### 13.4 Pagine a blocchi
Libreria di blocchi (`src/components/public/blocks/`): `Hero`, `RichText`, `Programma`, `Prezzi` (letti dal catalogo, mai scritti a mano), `CTAAcquisto`, `FAQ`, `Mappa`, `Galleria`, `Video`, `Sponsor`, `Countdown`, `Regolamento/Allegati`, `Recensioni`, `NumeriChiave`, `Tappe`. Ogni blocco ha `props` validati da zod e un editor nell'admin. Il tema del format (colori, logo, font) si applica tramite token CSS (§14.3).

### 13.5 SEO
- `generateMetadata` su ogni pagina e immagine OG per edizione.
- JSON-LD `EventSeries` sul format e `Event` sull'edizione, con `eventStatus` corretto (`EventScheduled`, `EventPostponed`, `EventCancelled`), `offers` dal catalogo e `location`.
- `sitemap.ts` generata da pagine statiche, format, edizioni pubblicate e notizie.

### 13.6 Pagina Trasparenza (decisione di Niccolo: solo trattamento dei dati e privacy)
`/trasparenza` **non** pubblica bilanci né documenti contabili. Completa l'attuale `/privacy` (`src/app/privacy/page.tsx`, da cui prende tono, struttura e stile) con una vista chiara e aggiornabile da admin:
1. **In breve**: tre o quattro frasi su quali dati raccogliamo e perché.
2. **Quali dati, per cosa e per quanto tempo**: una tabella per tipo di trattamento (acquisto biglietti, cassa, iscrizione soci, richiesta rimborso con IBAN, foto caricate dai visitatori, recensioni, iscrizione "Avvisami", widget WhatsApp), con dati raccolti, finalità, base giuridica e **tempo di conservazione**.
3. **Chi tratta i dati per nostro conto** (responsabili del trattamento): Vercel (hosting), Neon (database), Nexi (pagamenti), Resend (email), Cloudinary (immagini), Telegram (notifiche interne), Meta/WhatsApp (messaggi), con il link alla privacy di ciascuno e il paese in cui si trovano i server.
4. **Cookie**: elenco dei cookie tecnici effettivamente usati (sessione admin, carrello, tema), letto dalla configurazione.
5. **I tuoi diritti** e come esercitarli (accesso, rettifica, cancellazione, opposizione), con un modulo di richiesta che crea una voce nell'admin.
6. **Ultimo aggiornamento** e storico delle versioni.

I contenuti sono modificabili in `/admin/sito/trasparenza` (blocchi testo e tabella). L'elenco dei fornitori e dei cookie è dato strutturato, non testo libero.

⚠️ **Coerenza da garantire**: la `/privacy` attuale dice "Non cediamo mai i tuoi dati a terzi" e nomina solo Nexi. Le notifiche Telegram, però, oggi contengono nome, email e telefono dei clienti (`src/app/api/orders/route.ts`), e i dati transitano anche da Resend, Cloudinary, Vercel e Neon. La pagina va allineata alla realtà e le notifiche Telegram vanno ridotte a codice ordine, importo e numero di biglietti (regola §18.11).

---

## 14. Design system

### 14.1 Token semantici (`src/styles/tokens.css`)

> **Problema attuale da evitare**: in `globals.css` la scala `--neutral-*` viene **invertita** in modalità chiara (`--neutral-950` diventa il colore più chiaro) e `--white` diventa scuro. Così il nome di un colore non dice più cosa mostra. Nei nuovi componenti si usano **solo token semantici**.

```css
:root {                      /* chiaro */
  --bg:              #f6f7fb;
  --surface:         #ffffff;
  --surface-raised:  #ffffff;
  --surface-sunken:  #eef0f5;
  --border:          #e2e5ec;
  --border-strong:   #c9ced9;
  --text:            #151a2b;
  --text-muted:      #5b6377;
  --text-subtle:     #8a91a3;
  --primary:         #1b4baa;   /* blu del logo */
  --primary-hover:   #163f8f;
  --primary-fg:      #ffffff;
  --accent:          #c98f10;   /* oro del logo, scurito per il contrasto su fondo chiaro */
  --focus-ring:      #3a6de8;
  --success: #15803d;  --success-bg: #dcfce7;
  --warning: #b45309;  --warning-bg: #fef3c7;
  --danger:  #b91c1c;  --danger-bg:  #fee2e2;
  --info:    #1d4ed8;  --info-bg:    #e0eaff;
}
[data-theme="dark"] {
  --bg: #0b0e16; --surface: #121624; --surface-raised: #181d2e; --surface-sunken: #090b12;
  --border: #252b3d; --border-strong: #353c52;
  --text: #e8eaf2; --text-muted: #9aa1b5; --text-subtle: #6b7289;
  --primary: #4f7ff0; --primary-hover: #6b93f5; --primary-fg: #0b0e16;
  --accent: #e8a91a; --focus-ring: #6b93f5;
  --success: #4ade80; --success-bg: rgb(74 222 128 / .14);
  --warning: #fbbf24; --warning-bg: rgb(251 191 36 / .14);
  --danger:  #f87171; --danger-bg:  rgb(248 113 113 / .14);
  --info:    #93b4ff; --info-bg:    rgb(147 180 255 / .14);
}
```
Tailwind v4 espone questi token con `@theme` (`bg-surface`, `text-muted`, `border-border`…). I colori esadecimali scritti nei componenti sono vietati.

### 14.2 Tipografia
- **Admin e app da campo**: solo **DM Sans** (`--font-body`). Niente serif.
  - Scala: 12 (didascalie) · 13 (tabelle, etichette) · 14 (testo base) · 16 (titoli di sezione) · 20 (titolo pagina) · 28 (numeri KPI).
  - Pesi 400, 500, 600.
  - Numeri con `font-variant-numeric: tabular-nums` in tabelle e importi.
- **Sito pubblico**: Cormorant Garamond per i titoli, DM Sans per il testo, Playfair Display SC per le etichette (come oggi).

### 14.3 Temi dei format (solo sito pubblico)
Ogni format sovrascrive pochi token pubblici: `--brand`, `--brand-fg`, `--brand-surface`, `--brand-accent`, più il logo.
- Assaggia e Passeggia: `--brand: #283983`, `--brand-surface: #F9F3E4`, `--brand-accent: #E8C042`.
- Zuccaland: arancio, valori da estrarre da `ZuccalandClient.tsx`.

L'admin **non** usa i temi dei format, salvo un piccolo pallino colorato nel selettore di edizione.

### 14.4 Spaziatura, forme, ombre
- Griglia di 4 px: `4 8 12 16 20 24 32 40 48 64`.
- Raggi: `6` per input e badge, `8` per pulsanti, `12` per card e dialog, `9999` per chip e avatar.
- Ombre: nell'admin solo `shadow-sm` sulle card e `shadow-lg` su dialog e popover. Niente glow.
- Densità admin: righe di tabella da 44 px (36 in modalità compatta), input da 36 px. App da campo: pulsanti di almeno 56–64 px.

### 14.5 Componenti (`src/components/ui/`)
`Button` (varianti `primary | secondary | ghost | danger`, dimensioni `sm | md | lg`, `loading`, icona), `IconButton`, `Input`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `Switch`, `RadioGroup`, `DatePicker`, `MoneyInput` (centesimi), `Field` (etichetta, aiuto, errore), `Badge` (con `tone`), `StatusBadge` (mappa stato → tono), `Card`, `Stat`, `Tabs`, `Dialog`, `ConfirmDialog`, `Sheet`, `DropdownMenu`, `Popover`, `Tooltip`, `Toast`, `Skeleton`, `EmptyState`, `PageHeader`, `FilterBar`, `DataTable`, `BulkActionBar`, `Timeline`, `KeyValue`, `Avatar`, `Kbd`.

Mappa degli stati verso i toni (unica in tutto l'admin):

| Stato | Tono |
|---|---|
| `paid`, `on_sale`, `valid`, `succeeded` | success |
| `pending`, `published`, `requested`, `live` | warning (`live` = info) |
| `cancelled`, `failed`, `void`, `rejected`, `suspended` | danger |
| `refunded`, `partially_refunded`, `expired`, `archived`, `draft` | neutral |
| `concluded`, `sold_out` | info |

### 14.6 Icone
`lucide-react`: 16 px nel testo e nelle tabelle, 20 px nella sidebar e nei pulsanti. Una sola icona per concetto: Edizione `CalendarDays`, Ordine `Receipt`, Biglietto `Ticket`, Cliente `User`, Cassa `Store`, Scanner `ScanLine`, Rimborso `Undo2`, Modulo `Puzzle`, Impostazioni `Settings`, Registro `History`.

### 14.7 Accessibilità
- Contrasto WCAG AA in entrambi i temi.
- Focus visibile (`outline: 2px solid var(--focus-ring)`).
- Tutto si usa da tastiera e ogni `IconButton` ha un'etichetta.
- `prefers-reduced-motion` rispettato.
- Animazioni dell'admin al massimo di 150 ms.

---

## 15. Testi, lingua e formati

- Interfaccia **in italiano**, dando del **tu**. Codice, commenti tecnici, nomi di file e di variabili **in inglese**. Commit secondo Conventional Commits, in italiano come nella cronologia attuale (`feat(cassa): …`).
- I pulsanti usano verbo e oggetto: "Rimborsa ordine", "Apri turno", "Dichiara conclusa". Mai solo "OK" o "Invia".
- Gli errori dicono cosa è successo e cosa fare: "Il pagamento non è andato a buon fine. Riprova o scegli un altro metodo."
- **Importi**: `Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })` → "11,70 €". Utility unica: `formatMoney(cents)`.
- **Date**: fuso `Europe/Rome`. Elenchi: "dom 25 ott 2026, 10:30". Testo: "domenica 25 ottobre 2026". Relative recenti: "3 minuti fa". Utility unica in `src/lib/dates.ts`.
- **Codici ordine**: prefisso del format, anno e 4 caratteri senza ambiguità (`ZK26-7F3K`, alfabeto senza `0 O 1 I L`).
- La cassa registra **"contributi"**, senza scontrino fiscale (confermato da Niccolo). Scontrini, chiusure Z e rendiconti usano sempre "contributo" e mai "vendita", "scontrino fiscale" o "IVA". Il campo `vat_rate` resta vuoto.

---

## 16. Convenzioni di codice

- **Server Components di default**. `'use client'` solo dove serve interattività, e il più in basso possibile nell'albero.
- **Le mutazioni** passano da Server Actions (admin) o route handler (dispositivi e webhook), che chiamano i servizi di dominio. Un Server Component non chiama mai `fetch` verso le API del sito stesso: importa il servizio.
- **Limite di dimensione**: un file componente non supera le ~300 righe. Oltre, si divide. (Oggi `OrderManager.tsx` ne ha 4.239, `ZuccalandClient.tsx` 3.636, `admin/cassa/page.tsx` 2.584.)
- **Nessuno stile inline** nell'admin: classi Tailwind e primitive di `components/ui`.
- **Nomi**: componenti `PascalCase.tsx`, utilità `camelCase.ts`, rotte in italiano (`/admin/edizioni`), codice in inglese (`editions`).
- **Errori**: `DomainError(code)` nel dominio e `error.tsx` per segmento di rotta. Mai inghiottirli con `catch { return [] }` come oggi in `lib/data/events.ts`.
- **Log**: logger strutturato (`{ level, msg, orderId, editionId }`). Mai dati personali completi nei log.
- **Feature flag** per le migrazioni graduali: `site_settings.flags` (es. `orders_v2`).
- **Nessuna stringa evento cablata** (`'zuccaland-2026'`, `'assaggia-passeggia'`): si usa sempre l'`editionId` dal contesto.

---

## 17. Qualità e definizione di "fatto"

Una modifica è **fatta** quando:
1. `npm run lint`, `npm run typecheck` (`tsc --noEmit`) e `npm run test` passano senza errori nuovi;
2. i servizi di dominio toccati hanno test Vitest (casi normali, limiti e errori di permesso);
3. i flussi critici toccati (checkout, pagamento, cassa, check-in) hanno un test Playwright o un aggiornamento di quello esistente;
4. la pagina rispetta un modello di §11, con gli stati di caricamento, vuoto ed errore;
5. funziona a 375 px di larghezza e in entrambi i temi;
6. le migrazioni hanno un `down` o una nota di rollback;
7. questo file è aggiornato se la modifica cambia una regola, con una riga in §19;
8. la PR descrive Prima, Dopo, Come e Come verificare, con screenshot per le modifiche visive.

---

## 18. Regole invariabili

Queste regole non si violano mai, nemmeno temporaneamente:

1. **Mai** fidarsi di prezzi, totali, sconti o capienze inviati dal browser.
2. **Mai** segreti in variabili `NEXT_PUBLIC_*` o nel codice. Nessun valore di ripiego per password o chiavi.
3. **Mai** un endpoint che legge o modifica dati personali o ordini senza autenticazione e `requirePermission`.
4. **Mai** eseguire migrazioni, script o test contro il database di **produzione** senza il consenso esplicito di Niccolo.
5. **Mai** cancellare fisicamente ordini, pagamenti, rimborsi o voci del registro.
6. **Mai** rompere un URL pubblico già condiviso o stampato: si aggiunge un redirect permanente.
7. **Mai** modificare un'edizione `archived`.
8. **Mai** loggare IBAN, numeri di carta o token di accesso.
9. **Mai** fare merge o deploy in produzione: l'agente apre una PR e Niccolo approva.
10. Durante un'edizione `on_sale` o `live`, **nessuna modifica** al flusso di acquisto o alla cassa di quell'edizione, se non correzioni di sicurezza approvate.
11. **Mai** dati personali dei clienti (nome, email, telefono, IBAN) nelle notifiche Telegram o WhatsApp interne, nei messaggi di errore o negli allarmi: solo codici e importi.

---

## 19. Registro decisioni

| Data | Decisione | Fonte |
|---|---|---|
| 2026-10-18 | La card di un evento con pagina dedicata porta alla pagina dedicata, e `/eventi/[slug]` fa redirect | Niccolo, questionario 1A |
| 2026-10-18 | `/zuccaland` = edizione corrente o fuori stagione; archivio in `/zuccaland/<anno>`; l'archiviazione richiede di dichiarare prima l'evento concluso | 2A |
| 2026-10-18 | Pagina del format fuori stagione al posto della semplice pagina "Grazie" | 3A |
| 2026-10-18 | Menu Eventi a tendina con Calendario, Zuccaland, Assaggia e Passeggia (senza Baguette) | 4 |
| 2026-10-18 | I QR delle tappe A&P 2026 puntano a `/assaggia-e-passeggia/tappa/[id]`: URL da mantenere per sempre | 5A |
| 2026-10-18 | Footer: creare Trasparenza, rimuovere Volontari e Sostienici | 6B |
| 2026-10-18 | Trasparenza = **solo trattamento dei dati e privacy**, ispirata alla `/privacy` esistente (§13.6). Niente bilanci. | Niccolo, domande aperte 6 |
| 2026-10-18 | Admin multiutente con ruoli | 7B |
| 2026-10-18 | L'admin è il cervello: ordini e cassa comuni a tutti, modalità specifiche tramite moduli | 8 |
| 2026-10-18 | Edizioni concluse archiviate in sola lettura | 9A |
| 2026-10-18 | Lo sviluppo avviene tramite prompt per Antigravity, una PR per prompt, approvate da Niccolo | 10 |
| 2026-10-18 | Hosting su **Vercel** | domande aperte 1 |
| 2026-10-18 | Cassa = "contributi", senza scontrino fiscale | domande aperte 2 |
| 2026-10-18 | Almeno 2 dispositivi da campo per evento: cassa e scanner devono funzionare in parallelo su più dispositivi fin dal primo giorno | domande aperte 3 |
| 2026-10-18 | Nessun servizio esterno di monitoraggio: log di Vercel + allarmi Telegram senza dati personali | domande aperte 5 |
| 2026-10-19 | Prompt 07: finché non esiste `editions` (prompt 08), ruoli, dispositivi e registro usano `edition_slug`; il prompt 08 aggiunge `edition_id` e lo riempie dallo slug | Claude, esecuzione fase 1 |
| 2026-10-19 | Prompt 07: password con scrypt (già in uso, nessuna dipendenza nuova); TOTP rimandato; sul dispositivo si sceglie il nome e poi si digita il PIN | Claude, esecuzione fase 1 |
| 2026-10-19 | Prompt 07: i dispositivi li abbinano titolare e amministratori (`settings.manage`); gli utenti li gestisce solo il titolare (`users.manage`) | Claude, esecuzione fase 1 |
| 2026-10-19 | Prompt 08: lo slug dell'edizione non cambia mai e resta il riferimento in ruoli, dispositivi e registro (`edition_slug`), al posto di aggiungere `edition_id` | Claude, esecuzione fase 2 |
| 2026-10-19 | Prompt 08: le tabelle nuove che hanno già un omonimo legacy prendono il suffisso `_v2` (`discounts_v2`; poi `orders_v2`, `tickets_v2`, `refunds_v2`) | Claude, esecuzione fase 2 |
| 2026-10-19 | Prompt 08: la capienza di una data è una quota implicita sui prodotti di tipo biglietto che richiedono la data; vale sempre la quota più piccola | Claude, esecuzione fase 2 |
| 2026-10-19 | Prompt 08: duplicando un'edizione le date si spostano del multiplo di 7 giorni più vicino a N anni (stesso giorno della settimana, stessa ora di Roma) | Claude, esecuzione fase 2 |
| 2026-10-19 | Prompt 08: gli eventi che esistono solo nella cassa diventano edizioni in bozza; le scorte della cassa sono già "rimanenti" e non si sottraggono vendite | Claude, esecuzione fase 2 |
| 2026-10-19 | Prompt 09: un'integrazione è un ordine nuovo collegato (`parent_order_id`) con il suo pagamento, non righe aggiunte a un ordine pagato | Claude, esecuzione fase 2 |
| 2026-10-19 | Prompt 09: un pagamento che arriva dopo la scadenza riattiva l'ordine solo se i posti ci sono ancora; altrimenti evento `order.paid_after_expiry` per il rimborso | Claude, esecuzione fase 2 |
| 2026-10-19 | Prompt 09: i test sul database usano un Postgres locale (`proloco_test`), mai un branch Neon | Claude, esecuzione fase 2 |
| 2026-10-19 | Prompt 10: la migrazione scrive anche nelle edizioni archiviate (è storico importato, non una modifica) e salta quelle non concluse | Claude, esecuzione fase 2 |
| 2026-10-19 | Prompt 10: un'edizione con ordini migrati conta i posti solo dal nucleo nuovo; le altre sommano tabelle attuali e ordini nuovi | Claude, esecuzione fase 2 |
| 2026-10-19 | Prompt 11: i servizi del nucleo rifiutano le funzioni di un modulo spento (canali `invite` e `paylink`, cambio data), non solo l'interfaccia | Claude, esecuzione fase 2 |
| 2026-10-19 | Prompt 11: i moduli generici "Domande ai partecipanti" e "Rinvio date" diventano "Attività e laboratori" (`activities`) e "Rinvio per maltempo", con le regole di Zuccaland (giorni e posti delle attività, data di recupero, rimborso al secondo rinvio) | Niccolo, dopo la demo della fase 2 |
| 2026-10-19 | Zuccaland 2026: 10 e 11 ottobre sono date rinviate, recuperate il 17 e il 18 (`sessions.rescheduled_to_session_id`); ogni ordine ricorda la data scelta all'acquisto (`orders_v2.original_session_id`) | Niccolo |
| 2026-10-19 | Prompt 11: `zuccaland_photos` diventa `mod_visitor_photos_items` con il prompt 19; rinominarla ora romperebbe il caricamento pubblico di un'edizione in vendita | Claude, esecuzione fase 2 |
| 2026-10-19 | Prompt 13: codTrans di Nexi = codice ordine senza trattino + 8 caratteri del tentativo; ogni "Riprova" è un tentativo nuovo, `payments.provider_ref` = `nexi:<codTrans>` | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 13: un esito con importo diverso dal totale lascia l'ordine in attesa, salva il pagamento "in attesa" e manda un solo allarme Telegram (codice e importi) | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 13: il checkout nuovo resta chiuso per le edizioni che vendono ancora dalle pagine di oggi (vendite non migrate), e sostituisce i pulsanti d'acquisto di Zuccaland solo con `NUOVO_CHECKOUT=1` (§18.10) | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 13: richiesta di rimborso da "I miei biglietti" solo quando il modulo Rinvio la concede (secondo rinvio); in tutti gli altri casi il rimborso lo crea lo staff | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 13: test end-to-end con Playwright su un database locale `proloco_e2e` e un simulatore di Nexi (`NEXI_MODE=simulatore`, mai in produzione) | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 16: "Esaurita" automatica solo tra `on_sale` e `sold_out`, calcolata sui biglietti d'ingresso online nelle date future; non tocca mai `live` né una scelta fatta a mano su altri stati | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 16: per archiviare ogni controllo della checklist dev'essere a posto o saltato con motivo (owner/admin); `blocking` di un controllo vuol dire "non si può saltare" | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 16: il rendiconto finale (PDF e CSV) sta nel database (`edition_reports`) e non su Cloudinary, perché i link di Cloudinary sono pubblici e il rendiconto contiene gli incassi | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 16: il modulo Recensioni non ha ancora un controllo di chiusura: l'email di ringraziamento non esiste ancora | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 12: le pagine nuove di ordini, partecipanti e rimborsi esistono sempre nella sidebar dell'edizione; il flag `orders_v2` (site_settings, spento) decide solo se `/admin/ordini`, `/admin/rimborsi` e `/admin/prenotazioni` mostrano le pagine nuove o quelle di prima | Prompt 12 |
| 2026-10-19 | Prompt 12: viste salvate = tab fissi nel codice (Tutti, Da pagare, Pagati, Rimborsati, Blacklist) più quelle dell'utente in `admin_saved_views`, per utente e non per browser, così si ritrovano su ogni dispositivo | Prompt 12 |
| 2026-10-19 | Prompt 12: l'unione di due clienti non riscrive gli ordini (possono stare in edizioni archiviate, §18.7): il doppione prende `merged_into_id` e `deleted_at`, la scheda del cliente buono legge gli ordini di entrambi | Prompt 12 |
| 2026-10-19 | Prompt 12: note interne dell'ordine in una tabella a parte (`order_notes`), solo aggiunte e mai modificate, come un registro; le note del sistema di prima restano in `legacy_notes` | Prompt 12 |
| 2026-10-19 | Prompt 12: CSV con separatore ";" e BOM per Excel in italiano; le celle che iniziano con = + - @ prendono un apostrofo (anche i telefoni "+39") per non diventare formule | Prompt 12 |
| 2026-10-19 | Prompt 12: esportazioni (ordini, partecipanti, bonifici) con `reports.export`; l'IBAN intero nel CSV solo con `refunds.view_iban` su tutte le edizioni esportate, e l'esportazione resta nel registro | Prompt 12 |
| 2026-10-19 | Prompt 14: l'annullo di un contributo è uno storno con lo stesso metodo (rimborso già pagato, legato al turno che restituisce i soldi) più l'annullo dell'ordine; nulla si cancella | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 14: l'omaggio è un pagamento con metodo `complimentary` al valore della merce (motivo obbligatorio, solo canale `pos`), mostrato a parte e fuori dai contributi | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 14: un turno per cassa (indice unico sui turni aperti); un secondo telefono sulla stessa cassa entra nel turno già aperto | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 14: numero da chiamare e numero Z sono contatori per edizione (`cash_counters`); "Nuova giornata" fa solo ripartire il numero, il vecchio "salva storico e azzera" diventa il rendiconto filtrato per data | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 14: le vendite offline si accettano anche oltre la scorta o dopo la chiusura del turno (i soldi sono già in cassa) e restano segnalate in admin; l'ora è quella del telefono se ha meno di 48 ore | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 14: Z e rendiconto leggono gli stessi movimenti (pagamenti e storni legati ai turni), così la somma delle Z quadra con il rendiconto | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 14: la griglia della cassa raggruppa per reparto del prodotto, altrimenti per tipo (il catalogo nuovo non ha categorie); i prodotti legati a una data non si vendono in cassa | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 14: il tempo reale della cassa (SSE) legge il database ogni 2,5 s e chiude dopo 50 s, per funzionare con più istanze su Vercel | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 14: lo schermo "Pronti" è pubblico ma esiste solo con l'impostazione `readyScreen` del modulo reparti e mostra solo numeri | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 14: la nuova cassa non accetta il codice evento (solo dispositivo + PIN o admin); il QR della ricevuta online non si stampa | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 15: lo scanner nuovo è dietro il flag `site_settings.scanner_v2` (spento); `/scanner` serve il vecchio finché il flag è spento, `/scanner/nuovo` serve sempre il nuovo per le prove. I due scanner non vanno usati insieme sulla stessa edizione | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 15: un biglietto di una data rinviata vale nella data di recupero (catena di `rescheduled_to_session_id`) e non più nella data originale | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 15: se la lista di check-in ha una data, vale quella della lista e non quella scelta sullo scanner | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 15: la scansione fa prima una lettura senza transazione (gli esiti negativi rispondono in ~20 ms) e apre la transazione con `FOR UPDATE` sul biglietto solo per registrare un ingresso; i contatori si chiedono dopo, fuori dal percorso critico | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 15: offline in sola lettura con l'elenco degli hash SHA-256 (32 caratteri esadecimali) dei QR validi, mai dati personali; i passaggi offline si sincronizzano in modo idempotente con `checkins.client_id` (UNIQUE) | Claude, esecuzione fase 3 |
| 2026-10-19 | Prompt 15: il "+1 Bambino" allo scanner aggiorna solo la risposta `bambini` dell'ordine (con audit), non registra un pagamento: l'incasso resta in cassa o con un link di pagamento | Claude, esecuzione fase 3 (da confermare con Niccolo) |
| 2026-10-19 | Prompt 15: il lettore ZXing (wasm) è servito dal sito (`public/vendor/zxing/`), non dal CDN: serve offline e su iOS | Claude, esecuzione fase 3 |
| 2026-10-19 | Sviluppo locale: `LOCAL_DB_PROXY` in `instrumentation.ts` permette a ogni worktree il proprio proxy Neon (predefinito `localhost:4444`) | Claude, esecuzione fase 3 |
| 2026-10-20 | Prompt 17b: i blocchi stanno in `editions.page_blocks` e `series.page_blocks` (jsonb validato da zod); un blocco non valido si scarta in lettura, senza rompere la pagina | Claude, esecuzione fase 4 |
| 2026-10-20 | Prompt 17b: `/zuccaland` e `/assaggia-e-passeggia` passano alle pagine a blocchi solo con il flag `site_settings.public_v2` (spento); `/<format>/<anno>` e `/<format>` per i format nuovi sono sempre attive perché non sostituiscono URL esistenti | Claude, esecuzione fase 4 (§18.10) |
| 2026-10-20 | Prompt 17b: "in stagione" = edizione `live`, `on_sale`, `sold_out` o `published` (in quest'ordine; a parità la più vicina). Anche `sold_out` tiene la pagina dell'edizione, non quella fuori stagione | Claude, esecuzione fase 4 |
| 2026-10-20 | Prompt 17b: con il flag spento il pulsante Acquista delle pagine nuove di un'edizione che vende ancora dalla pagina di oggi porta a `/<format>#acquista`, non al checkout nuovo (chiuso per quelle edizioni) | Claude, esecuzione fase 4 |
| 2026-10-20 | Prompt 17b: l'editor salva tutta la pagina insieme con un'impronta dei blocchi letti; se nel frattempo un altro ha salvato, CONFLICT invece di sovrascrivere | Claude, esecuzione fase 4 |
| 2026-10-20 | Prompt 17b: Avvisami = una riga per format ed email (indice su `lower(email)`), consenso salvato come testo; l'avviso parte dall'evento `edition.on_sale` e "prenota" gli iscritti con un solo UPDATE…RETURNING, così non parte mai due volte per la stessa edizione; disiscrizione con token e clic di conferma | Claude, esecuzione fase 4 |
| 2026-10-20 | Prompt 17b: lo script di conversione scrive i blocchi anche nell'edizione archiviata A&P 2026 (contenuto importato, come la migrazione del prompt 10); l'editor invece la mostra in sola lettura | Claude, esecuzione fase 4 |
| 2026-10-20 | Prompt 17b: i prezzi non si copiano nei blocchi (né `ticketTypes` né `presale.priceInfo`): Prezzi, Acquista e Copertina li leggono dal catalogo | Claude, esecuzione fase 4 |
| 2026-10-20 | Prompt 17b: testo dei blocchi con una mini-sintassi (**, *, [link](url), "- ", "## ") resa come nodi React, mai HTML: niente `dangerouslySetInnerHTML` nelle pagine nuove | Claude, esecuzione fase 4 |

---

## 20. Domande aperte

Se un'attività dipende da una di queste domande, chiedi a Niccolo prima di procedere.

1. **Tipo di dispositivi da campo**: telefoni personali dei volontari o tablet dell'associazione? Finché non è deciso, cassa e scanner devono funzionare bene su entrambi (schermo da 360 px in su, Android e iOS, fotocamera posteriore).
2. **Prossima edizione** dopo Zuccaland 2026: non ancora definita. Quando lo sarà, diventa la prima creata interamente con il nuovo sistema.
3. **Conservazione dei dati** (§13.6 e prompt 16): proposta di 24 mesi dopo l'archiviazione, poi anonimizzazione. Da confermare.
