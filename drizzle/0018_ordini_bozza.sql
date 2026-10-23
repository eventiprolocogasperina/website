-- Ordini in bozza dall'admin: stato `draft` (non tiene posti, niente biglietti né pagamenti) e
-- `pay_on_site` per le bozze confermate con "Paga in loco". Solo aggiunte.
-- Rollback: ALTER TABLE "orders_v2" DROP COLUMN "pay_on_site"; per il valore dell'enum Postgres non ha
-- DROP VALUE: prima annullare le bozze (UPDATE orders_v2 SET status = 'cancelled' WHERE status = 'draft'),
-- poi ricreare il tipo senza 'draft' (CREATE TYPE … ; ALTER TABLE … ALTER COLUMN status TYPE … USING status::text::…).
ALTER TYPE "public"."order_status" ADD VALUE IF NOT EXISTS 'draft';--> statement-breakpoint
ALTER TABLE "orders_v2" ADD COLUMN "pay_on_site" boolean DEFAULT false NOT NULL;
