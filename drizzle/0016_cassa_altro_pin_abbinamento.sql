-- Cassa: "Altro" a importo libero (products.open_price, uno per edizione) e PIN del QR di abbinamento
-- dei dispositivi (device_pairings.pin_hash, pin_failed_attempts). Solo aggiunte.
-- Rollback: DROP INDEX "products_open_price_unique"; ALTER TABLE "products" DROP COLUMN "open_price";
-- ALTER TABLE "device_pairings" DROP COLUMN "pin_hash", DROP COLUMN "pin_failed_attempts".
ALTER TABLE "device_pairings" ADD COLUMN "pin_hash" text;--> statement-breakpoint
ALTER TABLE "device_pairings" ADD COLUMN "pin_failed_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "open_price" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "products_open_price_unique" ON "products" USING btree ("edition_id") WHERE "products"."open_price";