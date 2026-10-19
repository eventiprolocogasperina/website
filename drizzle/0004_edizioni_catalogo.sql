CREATE TYPE "public"."discount_kind" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."edition_status" AS ENUM('draft', 'published', 'on_sale', 'sold_out', 'live', 'concluded', 'archived', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."product_kind" AS ENUM('ticket', 'addon', 'food', 'drink', 'merch', 'donation', 'service');--> statement-breakpoint
CREATE TYPE "public"."public_page_mode" AS ENUM('generic', 'landing');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('open', 'closed', 'sold_out', 'cancelled', 'postponed');--> statement-breakpoint
CREATE TABLE "discounts_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid,
	"code" text NOT NULL,
	"kind" "discount_kind" NOT NULL,
	"value" integer NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"applies_to_product_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discounts_v2_code_upper" CHECK ("discounts_v2"."code" = upper("discounts_v2"."code")),
	CONSTRAINT "discounts_v2_value" CHECK ("discounts_v2"."value" > 0 AND ("discounts_v2"."kind" <> 'percent' OR "discounts_v2"."value" <= 100))
);
--> statement-breakpoint
CREATE TABLE "editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid,
	"slug" text NOT NULL,
	"year" integer,
	"title" text NOT NULL,
	"subtitle" text,
	"status" "edition_status" DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"location" text,
	"cover_image" text,
	"timezone" text DEFAULT 'Europe/Rome' NOT NULL,
	"public_page_mode" "public_page_mode" DEFAULT 'generic' NOT NULL,
	"enabled_modules" text[] DEFAULT '{}'::text[] NOT NULL,
	"module_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"concluded_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "editions_slug_format" CHECK ("editions"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "legacy_id_map" (
	"legacy_kind" text NOT NULL,
	"legacy_id" text NOT NULL,
	"new_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legacy_id_map_legacy_kind_legacy_id_pk" PRIMARY KEY("legacy_kind","legacy_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"kind" "product_kind" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"price_cents" integer NOT NULL,
	"vat_rate" integer,
	"channels" text[] DEFAULT '{}'::text[] NOT NULL,
	"requires_session" boolean DEFAULT false NOT NULL,
	"issues_ticket" boolean DEFAULT false NOT NULL,
	"checkin_list_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"department" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"min_per_order" integer,
	"max_per_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_positive" CHECK ("products"."price_cents" >= 0),
	CONSTRAINT "products_min_max" CHECK ("products"."min_per_order" IS NULL OR "products"."max_per_order" IS NULL OR "products"."min_per_order" <= "products"."max_per_order")
);
--> statement-breakpoint
CREATE TABLE "quota_products" (
	"quota_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	CONSTRAINT "quota_products_quota_id_product_id_pk" PRIMARY KEY("quota_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotas_size_positive" CHECK ("quotas"."size" >= 0)
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"landing_path" text,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"label" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"capacity" integer,
	"status" "session_status" DEFAULT 'open' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_capacity_positive" CHECK ("sessions"."capacity" IS NULL OR "sessions"."capacity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "discounts_v2" ADD CONSTRAINT "discounts_v2_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editions" ADD CONSTRAINT "editions_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_products" ADD CONSTRAINT "quota_products_quota_id_quotas_id_fk" FOREIGN KEY ("quota_id") REFERENCES "public"."quotas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_products" ADD CONSTRAINT "quota_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discounts_v2_code_unique" ON "discounts_v2" USING btree ("code");--> statement-breakpoint
CREATE INDEX "editions_series_idx" ON "editions" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "legacy_id_map_new_idx" ON "legacy_id_map" USING btree ("new_id");--> statement-breakpoint
CREATE INDEX "products_edition_idx" ON "products" USING btree ("edition_id");--> statement-breakpoint
CREATE INDEX "quota_products_product_idx" ON "quota_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "quotas_edition_idx" ON "quotas" USING btree ("edition_id");--> statement-breakpoint
CREATE INDEX "sessions_edition_idx" ON "sessions" USING btree ("edition_id");