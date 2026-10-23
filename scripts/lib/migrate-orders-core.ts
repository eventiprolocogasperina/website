/**
 * Cuore della migrazione degli ordini (prompt 10), separato dallo script perché lo usano anche i test.
 * Legge le tabelle di oggi (orders, tickets, cashier_orders, bookings, refund_requests) e scrive nel
 * nucleo nuovo. Non modifica né cancella nulla delle tabelle vecchie. Idempotente: ogni riga
 * migrata è in legacy_id_map e non viene ricreata.
 *
 * Lavora su una connessione `pg` già dentro una transazione aperta dal chiamante.
 */
import { randomBytes } from 'node:crypto';
import type { Client } from 'pg';
import { newOrderCode } from '../../src/server/domain/orders/code';
import { groupTickets, interpretNotes, LEGACY_PAYMENT_METHOD, LEGACY_REFUND_STATUS, matchProduct, toCents, type LegacyTicket } from '../../src/server/domain/orders/legacy-migration';
import { encryptIban } from '../../src/server/domain/refunds/crypto';
import { maskString } from '../../src/server/log';

export type MigrateOptions = {
  /** Solo questa edizione (slug). */
  edition?: string | null;
  /** Migra anche le edizioni non concluse (solo per prove in locale). */
  includeActive?: boolean;
  /** Gli ordini online in sospeso (PENDING, non cancellati) diventano "da pagare in loco", senza scadenza. */
  pendingOnSite?: boolean;
  now?: Date;
};

export type MigrationReport = {
  counts: Record<string, { created: number; existing: number }>;
  skipped: Array<{ what: string; id: string; reason: string }>;
  uninterpretedNotes: Array<{ orderId: string; edition: string; text: string }>;
  anomalies: Array<{ edition: string; id: string; text: string }>;
  createdProducts: Array<{ edition: string; name: string }>;
  editions: string[];
};

type EditionRow = { id: string; slug: string; year: number | null; status: string };
type ProductRow = { id: string; name: string; kind: string; requires_session: boolean; edition_id: string };

const ACTOR = 'Migrazione ordini (prompt 10)';
const SETTLED = ['concluded', 'archived'];

export async function migrateOrders(db: Client, opts: MigrateOptions = {}): Promise<MigrationReport> {
  const now = opts.now ?? new Date();
  const report: MigrationReport = { counts: {}, skipped: [], uninterpretedNotes: [], anomalies: [], createdProducts: [], editions: [] };
  const count = (what: string, created: boolean) => {
    report.counts[what] ??= { created: 0, existing: 0 };
    report.counts[what][created ? 'created' : 'existing']++;
  };

  const q = async <T extends object>(text: string, values: unknown[] = []) => (await db.query<T>(text, values)).rows;
  const one = async <T extends object>(text: string, values: unknown[] = []) => (await q<T>(text, values))[0] ?? null;
  const mapped = async (kind: string, id: string) => (await one<{ new_id: string }>('select new_id from legacy_id_map where legacy_kind = $1 and legacy_id = $2', [kind, id]))?.new_id ?? null;
  const remember = (kind: string, id: string, newId: string) => db.query('insert into legacy_id_map (legacy_kind, legacy_id, new_id) values ($1, $2, $3) on conflict do nothing', [kind, id, newId]);

  // Edizioni e loro corrispondenze con gli ID di oggi.
  const editions = await q<EditionRow>('select id, slug, year, status from editions');
  const editionById = new Map(editions.map((e) => [e.id, e]));
  const editionLinks = await q<{ legacy_id: string; edition_id: string }>('select legacy_id, edition_id from legacy_edition_ids');
  const editionFor = (legacyId: string) => {
    const link = editionLinks.find((l) => l.legacy_id === legacyId);
    return link ? editionById.get(link.edition_id)! : null;
  };
  const allowed = (e: EditionRow) => (!opts.edition || e.slug === opts.edition) && (opts.includeActive || SETTLED.includes(e.status));
  const used = new Set<string>();
  const touch = (e: EditionRow) => used.add(e.slug);

  const products = new Map<string, ProductRow[]>();
  const productsOf = async (editionId: string) => {
    if (!products.has(editionId)) products.set(editionId, await q<ProductRow>('select id, name, kind, requires_session, edition_id from products where edition_id = $1', [editionId]));
    return products.get(editionId)!;
  };
  /** Prodotto che il backfill non ha creato (es. articolo di cassa poi tolto dal listino): si crea spento. */
  const ensureProduct = async (e: EditionRow, name: string, kind: string, priceCents: number, requiresSession = false) => {
    const list = await productsOf(e.id);
    const found = matchProduct(name, list);
    if (found) return found;
    const row = (await one<ProductRow>(
      `insert into products (edition_id, kind, name, price_cents, channels, requires_session, issues_ticket, active, sort)
       values ($1, $2, $3, $4, '{}', $5, $6, false, 999) returning id, name, kind, requires_session, edition_id`,
      [e.id, kind, name, priceCents, requiresSession, kind === 'ticket' || kind === 'addon'],
    ))!;
    await remember('migrated_product', `${e.id}:${name}`, row.id);
    list.push(row);
    report.createdProducts.push({ edition: e.slug, name });
    return row;
  };

  const sessionsOf = async (editionId: string) => q<{ id: string }>('select id from sessions where edition_id = $1', [editionId]);
  const entranceList = new Map<string, string>();
  const listFor = async (e: EditionRow) => {
    if (entranceList.has(e.id)) return entranceList.get(e.id)!;
    const name = 'Ingresso (migrato)';
    const existing = await one<{ id: string }>('select id from checkin_lists where edition_id = $1 and name = $2', [e.id, name]);
    const id = existing?.id ?? (await one<{ id: string }>('insert into checkin_lists (edition_id, name) values ($1, $2) returning id', [e.id, name]))!.id;
    entranceList.set(e.id, id);
    return id;
  };

  const upsertCustomer = async (email: string, name: string | null, phone: string | null) => {
    const clean = email.trim().toLowerCase();
    if (!clean) return null;
    return (await one<{ id: string }>(
      `insert into customers (email, name, phone) values ($1, $2, $3)
       on conflict (email) do update set name = coalesce(customers.name, excluded.name), phone = coalesce(customers.phone, excluded.phone)
       returning id`,
      [clean, name?.trim() || null, phone?.trim() || null],
    ))!.id;
  };

  const insertOrder = async (e: EditionRow, v: Record<string, unknown>): Promise<string> => {
    for (let i = 0; i < 5; i++) {
      const row = await one<{ id: string }>(
        `insert into orders_v2 (code, edition_id, customer_id, channel, status, session_id, subtotal_cents, discount_cents, total_cents,
           access_token, legacy_notes, is_blacklisted, blacklist_reason, expires_at, paid_at, cancelled_at, deleted_at, created_at, updated_at, pay_on_site)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18, $19)
         on conflict (code) do nothing returning id`,
        [
          newOrderCode(e.slug, e.year),
          e.id,
          v.customerId ?? null,
          v.channel,
          v.status,
          v.sessionId ?? null,
          v.subtotal,
          v.discount,
          v.total,
          randomBytes(24).toString('base64url'),
          v.notes ?? null,
          v.blacklisted ?? false,
          v.blacklistReason ?? null,
          v.expiresAt ?? null,
          v.paidAt ?? null,
          v.cancelledAt ?? null,
          v.deletedAt ?? null,
          v.createdAt ?? now,
          v.payOnSite ?? false,
        ],
      );
      if (row) return row.id;
    }
    throw new Error('Impossibile generare un codice ordine libero');
  };
  const insertLine = async (orderId: string, productId: string, sessionId: string | null, quantity: number, unit: number, discount: number, department: string | null = null) =>
    (await one<{ id: string }>(
      `insert into order_lines (order_id, product_id, session_id, quantity, unit_price_cents, discount_cents, total_cents, department)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [orderId, productId, sessionId, quantity, unit, discount, unit * quantity - discount, department],
    ))!.id;
  const insertPayment = (orderId: string, method: string, amount: number, ref: string | null, at: Date | string) =>
    db.query(`insert into payments (order_id, method, amount_cents, status, provider_ref, raw, received_at) values ($1, $2, $3, 'succeeded', $4, $5, $6) on conflict (provider_ref) do nothing`, [
      orderId,
      method,
      amount,
      ref,
      JSON.stringify({ migrato: true }),
      at,
    ]);
  const auditRow = (action: string, entityId: string, edition: string, after: unknown, reason: string | null = null) =>
    db.query(`insert into audit_log (actor_label, action, entity_type, entity_id, edition_slug, after, reason) values ($1, $2, 'order', $3, $4, $5, $6)`, [
      ACTOR,
      action,
      entityId,
      edition,
      JSON.stringify(after),
      reason,
    ]);

  // Sconto per riga, diviso in proporzione e al centesimo.
  const spread = (discount: number, totals: number[]) => {
    const sum = totals.reduce((a, b) => a + b, 0);
    if (!discount || !sum) return totals.map(() => 0);
    const parts = totals.map((t) => Math.floor((discount * t) / sum));
    let rest = discount - parts.reduce((a, b) => a + b, 0);
    for (let i = 0; rest > 0; i = (i + 1) % parts.length) if (parts[i] < totals[i]) (parts[i]++, rest--);
    return parts;
  };

  // ─── 1. Ordini online e biglietti ──────────────────────────────────────────
  const legacyOrders = await q<{
    id: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string | null;
    totalAmount: string;
    status: string;
    notes: string | null;
    isBlacklisted: boolean | null;
    blacklistReason: string | null;
    deletedAt: string | null;
    createdAt: string | null;
    paidAt: string | null;
  }>('select * from orders order by "createdAt" nulls first, id');
  const legacyTickets = await q<LegacyTicket & { orderId: string; eventId: string }>('select * from tickets order by id');

  for (const o of legacyOrders) {
    const tickets = legacyTickets.filter((t) => t.orderId === o.id);
    if (!tickets.length) {
      report.skipped.push({ what: 'ordine online', id: o.id, reason: 'nessun biglietto: non si sa a quale edizione appartiene' });
      continue;
    }
    const e = editionFor(tickets[0].eventId);
    if (!e) {
      report.skipped.push({ what: 'ordine online', id: o.id, reason: `evento "${tickets[0].eventId}" senza edizione (manca il backfill?)` });
      continue;
    }
    if (!allowed(e)) continue;
    const notes = interpretNotes(o.notes);
    // Data scelta all'acquisto, se poi l'ordine è passato alla data di recupero (es. 10 → 17 ottobre).
    const originalSessionId =
      notes.originalDayKey && notes.originalDayKey !== notes.dayKey ? await mapped('zuccaland_day', `${tickets[0].eventId}:${notes.originalDayKey}`) : null;
    const already = await mapped('order', o.id);
    if (already) {
      // Ordini migrati prima che esistesse original_session_id: si completa, senza toccare altro.
      if (originalSessionId) await db.query('update orders_v2 set original_session_id = $2 where id = $1 and original_session_id is null', [already, originalSessionId]);
      count('ordini online', false);
      continue;
    }
    touch(e);

    for (const text of notes.uninterpreted) report.uninterpretedNotes.push({ orderId: o.id, edition: e.slug, text: maskString(text) });
    const sessions = await sessionsOf(e.id);
    const sessionId =
      (notes.dayKey ? await mapped('zuccaland_day', `${tickets[0].eventId}:${notes.dayKey}`) : null) ??
      (await mapped('event_session', tickets[0].eventId)) ??
      (sessions.length === 1 ? sessions[0].id : null);
    if (!sessionId && sessions.length > 1) report.anomalies.push({ edition: e.slug, id: o.id, text: 'data non indicata nelle note: ordine senza data' });

    const paid = o.status === 'PAID';
    const createdAt = o.createdAt ? new Date(o.createdAt) : now;
    const expiresAt = new Date(createdAt.getTime() + 15 * 60_000);
    const onSite = !paid && !!opts.pendingOnSite && o.status === 'PENDING' && !o.deletedAt;
    const status = paid ? 'paid' : onSite || expiresAt > now ? 'pending' : 'expired';
    const groups = groupTickets(tickets);
    const lines = [];
    for (const g of groups) lines.push({ g, product: await ensureProduct(e, g.type, 'ticket', g.unitPriceCents, !!sessionId) });
    const lineTotals = lines.map(({ g }) => g.unitPriceCents * g.tickets.length);
    let subtotal = lineTotals.reduce((a, b) => a + b, 0);
    const total = toCents(o.totalAmount);
    if (total > subtotal) {
      report.anomalies.push({ edition: e.slug, id: o.id, text: `totale ${total / 100} € maggiore della somma dei biglietti ${subtotal / 100} €: la differenza resta nel totale` });
      subtotal = total;
    }
    const discount = subtotal - total;
    const lineDiscounts = spread(Math.min(discount, lineTotals.reduce((a, b) => a + b, 0)), lineTotals);

    const orderId = await insertOrder(e, {
      customerId: await upsertCustomer(o.buyerEmail, o.buyerName, o.buyerPhone),
      channel: 'online',
      status,
      sessionId,
      subtotal,
      discount,
      total,
      notes: o.notes,
      blacklisted: !!o.isBlacklisted,
      blacklistReason: o.blacklistReason,
      expiresAt: paid || onSite ? null : expiresAt,
      payOnSite: onSite,
      paidAt: paid ? (o.paidAt ?? o.createdAt) : null,
      deletedAt: o.deletedAt,
      createdAt,
    });

    for (const [i, { g, product }] of lines.entries()) {
      const lineSession = product.requires_session ? sessionId : null;
      const lineId = await insertLine(orderId, product.id, lineSession, g.tickets.length, g.unitPriceCents, lineDiscounts[i]);
      for (const t of g.tickets) {
        const clash = await one<{ id: string }>('select id from tickets_v2 where qr_token = $1', [t.qrCodeData]);
        if (clash) {
          report.anomalies.push({ edition: e.slug, id: o.id, text: `QR del biglietto ${t.id} già presente in un altro biglietto nuovo: non copiato` });
          continue;
        }
        const ticket = (await one<{ id: string }>(
          `insert into tickets_v2 (order_id, order_line_id, edition_id, product_id, session_id, qr_token, status) values ($1, $2, $3, $4, $5, $6, $7) returning id`,
          [orderId, lineId, e.id, product.id, lineSession, t.qrCodeData, paid ? 'valid' : 'void'],
        ))!;
        await remember('ticket', t.id, ticket.id);
        if (t.isCheckedIn) {
          await db.query('insert into checkins (ticket_id, checkin_list_id, at) values ($1, $2, $3)', [ticket.id, await listFor(e), t.checkInTime ?? o.paidAt ?? createdAt]);
        }
      }
    }
    for (const a of notes.answers) {
      await db.query('insert into attendee_answers (order_id, question_key, value) values ($1, $2, $3)', [orderId, a.questionKey, JSON.stringify(a.value)]);
    }
    if (originalSessionId) await db.query('update orders_v2 set original_session_id = $2 where id = $1', [orderId, originalSessionId]);
    if (notes.originalDayKey && notes.originalDayKey !== notes.dayKey) {
      await auditRow('order.session_moved', orderId, e.slug, { da: notes.originalDayKey, a: notes.dayKey, spostamenti: notes.moves }, 'Spostamento registrato nelle note del vecchio sistema');
    }
    if (paid) {
      const integrations = notes.integrations.reduce((s, i) => s + i.amountCents, 0);
      const main = total - integrations;
      if (main < 0) report.anomalies.push({ edition: e.slug, id: o.id, text: 'integrazioni maggiori del totale: pagamento principale a 0 €' });
      await insertPayment(orderId, total === 0 ? 'complimentary' : 'nexi', Math.max(0, main), `legacy-order:${o.id}`, o.paidAt ?? createdAt);
      for (const [i, integ] of notes.integrations.entries()) {
        await insertPayment(orderId, 'nexi', integ.amountCents, `legacy-integration:${integ.transactionId ?? `${o.id}:${i}`}`, o.paidAt ?? createdAt);
      }
    }
    await remember('order', o.id, orderId);
    count('ordini online', true);
  }

  // ─── 2. Ordini della cassa ─────────────────────────────────────────────────
  type CashItem = { id?: string; name: string; price: number | string; quantity: number; department?: string; category?: string };
  const cashOrders = await q<{
    id: string;
    eventId: string;
    orderNumber: number;
    cassaName: string;
    operatorName: string | null;
    totalAmount: string;
    paymentMethod: string;
    omaggioNote: string | null;
    items: CashItem[];
    status: string;
    createdAt: string | null;
  }>('select * from cashier_orders order by "createdAt" nulls first, id');
  for (const c of cashOrders) {
    const e = editionFor(c.eventId);
    if (!e) {
      report.skipped.push({ what: 'ordine di cassa', id: c.id, reason: `evento di cassa "${c.eventId}" senza edizione` });
      continue;
    }
    if (!allowed(e)) continue;
    if (await mapped('cashier_order', c.id)) {
      count('ordini di cassa', false);
      continue;
    }
    touch(e);
    const method = LEGACY_PAYMENT_METHOD[c.paymentMethod as keyof typeof LEGACY_PAYMENT_METHOD];
    if (!method) report.anomalies.push({ edition: e.slug, id: c.id, text: `metodo di pagamento sconosciuto "${c.paymentMethod}": registrato come contanti` });
    const items = Array.isArray(c.items) ? c.items : [];
    const lines = [];
    for (const it of items) {
      const productId =
        (it.id ? await mapped('cashier_item', `${c.eventId}:${it.id}`) : null) ??
        (await ensureProduct(e, it.name, /bar|bevand|drink/i.test(`${it.category ?? ''} ${it.department ?? ''}`) ? 'drink' : 'food', toCents(it.price))).id;
      lines.push({ productId, quantity: Math.max(1, Number(it.quantity) || 1), unit: toCents(it.price), department: it.department ?? it.category ?? null });
    }
    const totals = lines.map((l) => l.unit * l.quantity);
    let subtotal = totals.reduce((a, b) => a + b, 0);
    const total = toCents(c.totalAmount);
    if (total > subtotal) {
      report.anomalies.push({ edition: e.slug, id: c.id, text: `totale ${total / 100} € maggiore della somma degli articoli ${subtotal / 100} €` });
      subtotal = total;
    }
    const discounts = spread(Math.min(subtotal - total, totals.reduce((a, b) => a + b, 0)), totals);
    const voided = c.status === 'VOIDED';
    const createdAt = c.createdAt ? new Date(c.createdAt) : now;
    const orderId = await insertOrder(e, {
      channel: 'pos',
      status: voided ? 'cancelled' : 'paid',
      subtotal,
      discount: subtotal - total,
      total,
      notes: [`Cassa: ${c.cassaName}`, `N. ${c.orderNumber}`, c.operatorName && `Operatore: ${c.operatorName}`, c.omaggioNote && `Omaggio: ${c.omaggioNote}`].filter(Boolean).join(' | '),
      paidAt: voided ? null : createdAt,
      cancelledAt: voided ? createdAt : null,
      createdAt,
    });
    for (const [i, l] of lines.entries()) await insertLine(orderId, l.productId, null, l.quantity, l.unit, discounts[i], l.department);
    if (!voided) await insertPayment(orderId, method ?? 'cash', total, `legacy-cashier:${c.id}`, createdAt);
    await remember('cashier_order', c.id, orderId);
    count('ordini di cassa', true);
  }

  // ─── 3. Prenotazioni gratuite ──────────────────────────────────────────────
  const bookings = await q<{
    id: string;
    event_id: string;
    nome: string;
    cognome: string;
    email: string;
    telefono: string | null;
    partecipanti: number;
    note: string | null;
    stato: string;
    createdAt: string | null;
    checkedIn: boolean | null;
  }>('select * from bookings order by "createdAt" nulls first, id');
  for (const b of bookings) {
    const e = editionFor(b.event_id);
    if (!e) {
      report.skipped.push({ what: 'prenotazione', id: b.id, reason: `evento "${b.event_id}" senza edizione` });
      continue;
    }
    if (!allowed(e)) continue;
    if (await mapped('booking', b.id)) {
      count('prenotazioni', false);
      continue;
    }
    touch(e);
    const productId = (await mapped('event_product', b.event_id)) ?? (await ensureProduct(e, 'Prenotazione', 'ticket', 0, true)).id;
    const sessionId = await mapped('event_session', b.event_id);
    const confirmed = b.stato === 'confermato';
    const createdAt = b.createdAt ? new Date(b.createdAt) : now;
    const orderId = await insertOrder(e, {
      customerId: await upsertCustomer(b.email, `${b.nome} ${b.cognome}`, b.telefono),
      channel: 'online',
      status: confirmed ? 'paid' : 'cancelled',
      sessionId,
      subtotal: 0,
      discount: 0,
      total: 0,
      notes: b.note,
      paidAt: confirmed ? createdAt : null,
      cancelledAt: confirmed ? null : createdAt,
      createdAt,
    });
    const quantity = Math.max(1, b.partecipanti || 1);
    const lineId = await insertLine(orderId, productId, sessionId, quantity, 0, 0);
    if (confirmed) await insertPayment(orderId, 'complimentary', 0, `legacy-booking:${b.id}`, createdAt);
    if (b.note?.trim()) await db.query('insert into attendee_answers (order_id, question_key, value) values ($1, $2, $3)', [orderId, 'note', JSON.stringify(b.note.trim())]);
    if (b.checkedIn) {
      // Le prenotazioni non avevano QR: per non perdere l'ingresso si crea un biglietto interno.
      const ticket = (await one<{ id: string }>(
        `insert into tickets_v2 (order_id, order_line_id, edition_id, product_id, session_id, qr_token) values ($1, $2, $3, $4, $5, $6) returning id`,
        [orderId, lineId, e.id, productId, sessionId, `booking-${b.id}`],
      ))!;
      await db.query('insert into checkins (ticket_id, checkin_list_id, at) values ($1, $2, $3)', [ticket.id, await listFor(e), createdAt]);
    }
    await remember('booking', b.id, orderId);
    count('prenotazioni', true);
  }

  // ─── 4. Richieste di rimborso ──────────────────────────────────────────────
  const refunds = await q<{
    id: string;
    full_name: string;
    booking_numbers: string;
    account_holder: string | null;
    iban: string | null;
    reason: string | null;
    status: string;
    created_at: string | null;
    updated_at: string | null;
  }>('select * from refund_requests order by created_at nulls first, id');
  for (const r of refunds) {
    if (await mapped('refund_request', r.id)) {
      count('rimborsi', false);
      continue;
    }
    // Il modulo di oggi chiedeva "codici biglietto o codice ordine": nelle richieste vere ci sono
    // i primi 16 caratteri dell'ID biglietto (es. 1a2b3c4d-5e6f-7a) o "#" + i primi 8 dell'ordine.
    // Si accetta anche l'ID intero. Un prefisso vale solo se indica un'unica riga.
    const wanted = new Map<string, { legacyOrderId: string; ticketCents: number | null }>();
    for (const raw of r.booking_numbers.split(/[\s,;]+/).filter(Boolean)) {
      const token = raw.replace(/^#/, '').toLowerCase();
      if (token.length < 8) continue;
      const tickets = await q<{ id: string; orderId: string; price: string | number }>('select id, "orderId", price from tickets where lower(id) like $1 limit 2', [`${token}%`]);
      const orders = tickets.length ? [] : await q<{ id: string }>('select id from orders where lower(id) like $1 limit 2', [`${token}%`]);
      if (tickets.length === 1) {
        const t = tickets[0];
        const prev = wanted.get(t.orderId);
        if (prev?.ticketCents !== null) wanted.set(t.orderId, { legacyOrderId: t.orderId, ticketCents: (prev?.ticketCents ?? 0) + toCents(t.price) });
      } else if (orders.length === 1) {
        wanted.set(orders[0].id, { legacyOrderId: orders[0].id, ticketCents: null });
      }
    }
    const targets: { orderId: string; ticketCents: number | null }[] = [];
    for (const w of wanted.values()) {
      const orderId = await mapped('order', w.legacyOrderId);
      if (orderId) targets.push({ orderId, ticketCents: w.ticketCents });
    }
    if (!targets.length) {
      report.skipped.push({ what: 'richiesta di rimborso', id: r.id, reason: 'nessun ordine migrato corrisponde ai codici indicati' });
      continue;
    }
    const status = LEGACY_REFUND_STATUS[r.status as keyof typeof LEGACY_REFUND_STATUS] ?? 'requested';
    let first: string | null = null;
    for (const target of targets) {
      const orderId = target.orderId;
      const order = (await one<{ id: string; edition_id: string; total_cents: number; status: string }>('select id, edition_id, total_cents, status from orders_v2 where id = $1', [orderId]))!;
      const e = editionById.get(order.edition_id)!;
      if (!allowed(e)) continue;
      const already = Number((await one<{ n: string }>(`select coalesce(sum(amount_cents), 0) as n from refunds_v2 where order_id = $1 and status <> 'rejected'`, [orderId]))!.n);
      const amount = Math.min(target.ticketCents ?? order.total_cents, order.total_cents - already);
      if (amount <= 0) {
        report.skipped.push({ what: 'richiesta di rimborso', id: r.id, reason: 'ordine gratuito o già rimborsato per intero' });
        continue;
      }
      // Il vecchio modulo non chiedeva l'importo: si usa il prezzo dei biglietti indicati, o l'intero ordine.
      report.anomalies.push({ edition: e.slug, id: r.id, text: `importo non indicato nella richiesta: assunto ${target.ticketCents === null ? "l'intero ordine" : 'il prezzo dei biglietti indicati'} (${amount / 100} €)` });
      const row = (await one<{ id: string }>(
        `insert into refunds_v2 (order_id, amount_cents, reason, method, status, iban_encrypted, holder_name, requested_at, processed_at)
         values ($1, $2, $3, 'bank_transfer', $4, $5, $6, $7, $8) returning id`,
        [orderId, amount, r.reason, status, r.iban ? encryptIban(r.iban.replace(/\s/g, '').toUpperCase()) : null, r.account_holder ?? r.full_name, r.created_at ?? now, ['paid', 'rejected'].includes(status) ? (r.updated_at ?? now) : null],
      ))!;
      if (status === 'paid' && ['paid', 'partially_refunded'].includes(order.status)) {
        const whole = already + amount >= order.total_cents;
        await db.query(`update orders_v2 set status = $2, updated_at = now() where id = $1`, [orderId, whole ? 'refunded' : 'partially_refunded']);
        if (whole) await db.query(`update tickets_v2 set status = 'void', updated_at = now() where order_id = $1`, [orderId]);
      }
      // Una richiesta che copre più ordini diventa più rimborsi: il primo tiene l'ID della richiesta.
      if (first) await remember('refund_request_extra', `${r.id}:${orderId}`, row.id);
      else first = row.id;
    }
    if (!first) continue;
    await remember('refund_request', r.id, first);
    count('rimborsi', true);
  }

  report.editions = [...used].sort();
  if (Object.values(report.counts).some((c) => c.created)) {
    await db.query(`insert into audit_log (actor_label, action, entity_type, after) values ($1, 'orders.migrated', 'migration', $2)`, [ACTOR, JSON.stringify({ counts: report.counts, editions: report.editions })]);
  }
  return report;
}

export type ReconRow = Record<string, string | number>;

/** I numeri delle viste legacy_vs_v2_*, per edizione. */
export async function reconciliation(db: Client, slug: string): Promise<Record<'online' | 'pos' | 'bookings', ReconRow | null>> {
  const get = async (view: string) => (await db.query<ReconRow>(`select * from ${view} where edizione = $1`, [slug])).rows[0] ?? null;
  return { online: await get('legacy_vs_v2_online'), pos: await get('legacy_vs_v2_pos'), bookings: await get('legacy_vs_v2_bookings') };
}
