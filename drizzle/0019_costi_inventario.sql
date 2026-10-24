-- Costi (per edizione o generali) e inventario del materiale con i suoi movimenti. Solo aggiunte.
-- Numerata 0019: la 0018 è riservata allo stato 'draft' degli ordini (ramo parallelo).
-- Rollback: DROP TABLE "costs"; DROP TABLE "inventory_movements"; DROP TABLE "inventory_items";
-- DROP TYPE "cost_payment_method"; DROP TYPE "inventory_condition"; DROP TYPE "inventory_movement_kind".
CREATE TYPE "public"."cost_payment_method" AS ENUM('cash', 'bank_transfer', 'card', 'other');--> statement-breakpoint
CREATE TYPE "public"."inventory_condition" AS ENUM('good', 'needs_repair', 'broken');--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_kind" AS ENUM('added', 'event_use', 'lost', 'broken', 'correction');--> statement-breakpoint
CREATE TABLE "costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid,
	"spent_on" date NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"supplier" text,
	"amount_cents" integer NOT NULL,
	"payment_method" "cost_payment_method" NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_at" date,
	"attachment_url" text,
	"notes" text,
	"inventory_item_id" uuid,
	"created_by" uuid,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "costs_amount_check" CHECK ("costs"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit" text DEFAULT 'pz' NOT NULL,
	"location" text,
	"condition" "inventory_condition" DEFAULT 'good' NOT NULL,
	"purchased_on" date,
	"purchase_value_cents" integer,
	"notes" text,
	"photo_url" text,
	"dismissed_at" timestamp with time zone,
	"dismiss_reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_quantity_check" CHECK ("inventory_items"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"kind" "inventory_movement_kind" NOT NULL,
	"quantity" integer NOT NULL,
	"edition_id" uuid,
	"returned_at" timestamp with time zone,
	"returned_quantity" integer,
	"from_movement_id" uuid,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_event_use_check" CHECK ("inventory_movements"."kind" <> 'event_use' OR ("inventory_movements"."quantity" > 0 AND "inventory_movements"."edition_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "costs" ADD CONSTRAINT "costs_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costs" ADD CONSTRAINT "costs_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costs" ADD CONSTRAINT "costs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_from_movement_id_inventory_movements_id_fk" FOREIGN KEY ("from_movement_id") REFERENCES "public"."inventory_movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "costs_edition_idx" ON "costs" USING btree ("edition_id","spent_on");--> statement-breakpoint
CREATE INDEX "costs_spent_on_idx" ON "costs" USING btree ("spent_on");--> statement-breakpoint
CREATE INDEX "inventory_movements_item_idx" ON "inventory_movements" USING btree ("item_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_movements_edition_idx" ON "inventory_movements" USING btree ("edition_id");