-- Viste di confronto tra le tabelle di oggi e il nucleo ordini (prompt 10).
-- Contano solo le righe nuove nate dalla migrazione (legacy_id_map), così il confronto resta valido
-- anche dopo che arrivano ordini nuovi. Si interrogano in sola lettura: SELECT * FROM legacy_vs_v2_online;
CREATE VIEW "legacy_edition_ids" AS
  SELECT DISTINCT legacy_id, new_id AS edition_id FROM legacy_id_map WHERE legacy_kind IN ('event', 'legacy_event_id', 'cashier_event');
--> statement-breakpoint
CREATE VIEW "legacy_vs_v2_online" AS
WITH lo AS (
  SELECT o.id, o.status, round(o."totalAmount" * 100)::int AS total_cents,
    (SELECT e.edition_id FROM tickets t JOIN legacy_edition_ids e ON e.legacy_id = t."eventId" WHERE t."orderId" = o.id LIMIT 1) AS edition_id
  FROM orders o
),
l AS (
  SELECT edition_id, count(*) AS orders, count(*) FILTER (WHERE status = 'PAID') AS paid_orders,
    coalesce(sum(total_cents) FILTER (WHERE status = 'PAID'), 0) AS paid_cents
  FROM lo GROUP BY edition_id
),
lt AS (
  SELECT e.edition_id, count(*) AS tickets, count(*) FILTER (WHERE t."isCheckedIn") AS checkins
  FROM tickets t JOIN legacy_edition_ids e ON e.legacy_id = t."eventId" GROUP BY e.edition_id
),
vo AS (SELECT o.* FROM orders_v2 o JOIN legacy_id_map m ON m.new_id = o.id AND m.legacy_kind = 'order'),
v AS (
  SELECT vo.edition_id, count(*) AS orders, count(*) FILTER (WHERE vo.status IN ('paid', 'partially_refunded', 'refunded')) AS paid_orders,
    coalesce(sum((SELECT sum(p.amount_cents) FROM payments p WHERE p.order_id = vo.id AND p.status = 'succeeded')), 0) AS paid_cents
  FROM vo GROUP BY vo.edition_id
),
vt AS (
  SELECT vo.edition_id, count(t.id) AS tickets,
    count(t.id) FILTER (WHERE EXISTS (SELECT 1 FROM checkins c WHERE c.ticket_id = t.id AND c.reverted_at IS NULL)) AS checkins
  FROM vo JOIN tickets_v2 t ON t.order_id = vo.id GROUP BY vo.edition_id
)
SELECT ed.slug AS edizione,
  coalesce(l.orders, 0) AS ordini_vecchi, coalesce(v.orders, 0) AS ordini_nuovi,
  coalesce(l.paid_orders, 0) AS pagati_vecchi, coalesce(v.paid_orders, 0) AS pagati_nuovi,
  coalesce(lt.tickets, 0) AS biglietti_vecchi, coalesce(vt.tickets, 0) AS biglietti_nuovi,
  coalesce(l.paid_cents, 0) AS incasso_vecchio_cents, coalesce(v.paid_cents, 0) AS incasso_nuovo_cents,
  coalesce(lt.checkins, 0) AS checkin_vecchi, coalesce(vt.checkins, 0) AS checkin_nuovi
FROM editions ed
LEFT JOIN l ON l.edition_id = ed.id LEFT JOIN lt ON lt.edition_id = ed.id
LEFT JOIN v ON v.edition_id = ed.id LEFT JOIN vt ON vt.edition_id = ed.id
WHERE l.edition_id IS NOT NULL OR v.edition_id IS NOT NULL;
--> statement-breakpoint
CREATE VIEW "legacy_vs_v2_pos" AS
WITH l AS (
  SELECT e.edition_id, count(*) AS orders,
    count(*) FILTER (WHERE c.status = 'VOIDED') AS voided,
    coalesce(sum(round(c."totalAmount" * 100)) FILTER (WHERE c.status <> 'VOIDED' AND c."paymentMethod" = 'CONTANTI'), 0)::int AS cash_cents,
    coalesce(sum(round(c."totalAmount" * 100)) FILTER (WHERE c.status <> 'VOIDED' AND c."paymentMethod" = 'POS'), 0)::int AS card_cents,
    count(*) FILTER (WHERE c.status <> 'VOIDED' AND c."paymentMethod" = 'OMAGGIO') AS complimentary
  FROM cashier_orders c JOIN legacy_edition_ids e ON e.legacy_id = c."eventId" GROUP BY e.edition_id
),
vo AS (SELECT o.* FROM orders_v2 o JOIN legacy_id_map m ON m.new_id = o.id AND m.legacy_kind = 'cashier_order'),
v AS (
  SELECT vo.edition_id, count(*) AS orders, count(*) FILTER (WHERE vo.status = 'cancelled') AS voided,
    coalesce(sum(p.amount_cents) FILTER (WHERE p.method = 'cash' AND vo.status <> 'cancelled'), 0)::int AS cash_cents,
    coalesce(sum(p.amount_cents) FILTER (WHERE p.method = 'card_pos' AND vo.status <> 'cancelled'), 0)::int AS card_cents,
    count(p.id) FILTER (WHERE p.method = 'complimentary' AND vo.status <> 'cancelled') AS complimentary
  FROM vo LEFT JOIN payments p ON p.order_id = vo.id AND p.status = 'succeeded' GROUP BY vo.edition_id
)
SELECT ed.slug AS edizione,
  coalesce(l.orders, 0) AS ordini_vecchi, coalesce(v.orders, 0) AS ordini_nuovi,
  coalesce(l.voided, 0) AS annullati_vecchi, coalesce(v.voided, 0) AS annullati_nuovi,
  coalesce(l.cash_cents, 0) AS contanti_vecchi_cents, coalesce(v.cash_cents, 0) AS contanti_nuovi_cents,
  coalesce(l.card_cents, 0) AS pos_vecchi_cents, coalesce(v.card_cents, 0) AS pos_nuovi_cents,
  coalesce(l.complimentary, 0) AS omaggi_vecchi, coalesce(v.complimentary, 0) AS omaggi_nuovi
FROM editions ed LEFT JOIN l ON l.edition_id = ed.id LEFT JOIN v ON v.edition_id = ed.id
WHERE l.edition_id IS NOT NULL OR v.edition_id IS NOT NULL;
--> statement-breakpoint
CREATE VIEW "legacy_vs_v2_bookings" AS
WITH l AS (
  SELECT e.edition_id, count(*) AS bookings, count(*) FILTER (WHERE b.stato = 'confermato') AS confirmed,
    coalesce(sum(b.partecipanti) FILTER (WHERE b.stato = 'confermato'), 0) AS people, count(*) FILTER (WHERE b."checkedIn") AS checkins
  FROM bookings b JOIN legacy_edition_ids e ON e.legacy_id = b.event_id GROUP BY e.edition_id
),
vo AS (SELECT o.* FROM orders_v2 o JOIN legacy_id_map m ON m.new_id = o.id AND m.legacy_kind = 'booking'),
v AS (
  SELECT vo.edition_id, count(*) AS bookings, count(*) FILTER (WHERE vo.status = 'paid') AS confirmed,
    coalesce(sum((SELECT sum(ol.quantity) FROM order_lines ol WHERE ol.order_id = vo.id)) FILTER (WHERE vo.status = 'paid'), 0) AS people,
    count(*) FILTER (WHERE EXISTS (SELECT 1 FROM tickets_v2 t JOIN checkins c ON c.ticket_id = t.id AND c.reverted_at IS NULL WHERE t.order_id = vo.id)) AS checkins
  FROM vo GROUP BY vo.edition_id
)
SELECT ed.slug AS edizione,
  coalesce(l.bookings, 0) AS prenotazioni_vecchie, coalesce(v.bookings, 0) AS prenotazioni_nuove,
  coalesce(l.confirmed, 0) AS confermate_vecchie, coalesce(v.confirmed, 0) AS confermate_nuove,
  coalesce(l.people, 0) AS persone_vecchie, coalesce(v.people, 0) AS persone_nuove,
  coalesce(l.checkins, 0) AS checkin_vecchi, coalesce(v.checkins, 0) AS checkin_nuovi
FROM editions ed LEFT JOIN l ON l.edition_id = ed.id LEFT JOIN v ON v.edition_id = ed.id
WHERE l.edition_id IS NOT NULL OR v.edition_id IS NOT NULL;
--> statement-breakpoint
CREATE VIEW "legacy_vs_v2_refunds" AS
WITH l AS (SELECT status, count(*) AS n FROM refund_requests GROUP BY status),
v AS (
  SELECT r.status::text AS status, count(*) AS n, sum(r.amount_cents) AS cents
  FROM refunds_v2 r JOIN legacy_id_map m ON m.new_id = r.id AND m.legacy_kind = 'refund_request' GROUP BY r.status
),
pairs(vecchio, nuovo) AS (VALUES ('pending', 'requested'), ('approved', 'approved'), ('refunded', 'paid'), ('rejected', 'rejected'))
SELECT pairs.vecchio AS stato_vecchio, pairs.nuovo AS stato_nuovo, coalesce(l.n, 0) AS richieste_vecchie, coalesce(v.n, 0) AS richieste_nuove, coalesce(v.cents, 0) AS importo_nuovo_cents
FROM pairs LEFT JOIN l ON l.status = pairs.vecchio LEFT JOIN v ON v.status = pairs.nuovo;
