ALTER TYPE "public"."refund_method" ADD VALUE 'card_pos';--> statement-breakpoint
ALTER TYPE "public"."refund_method" ADD VALUE 'complimentary';--> statement-breakpoint
CREATE TABLE "order_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"author_user_id" uuid,
	"author_label" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_saved_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"name" text NOT NULL,
	"query" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_counters" (
	"edition_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_counters_edition_id_kind_pk" PRIMARY KEY("edition_id","kind"),
	CONSTRAINT "cash_counters_kind" CHECK ("cash_counters"."kind" IN ('order_number', 'z_report'))
);
--> statement-breakpoint
CREATE TABLE "cash_registers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"product_ids" uuid[],
	"printer_settings" jsonb,
	"issues_numbers" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_sales" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"edition_id" uuid NOT NULL,
	"cash_session_id" uuid NOT NULL,
	"register_id" uuid NOT NULL,
	"number" integer,
	"cash_received_cents" integer,
	"change_cents" integer,
	"complimentary_reason" text,
	"offline_at" timestamp with time zone,
	"oversold" boolean DEFAULT false NOT NULL,
	"after_close" boolean DEFAULT false NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by" uuid,
	"void_approved_by" uuid,
	"void_reason" text,
	"void_cash_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"register_id" uuid NOT NULL,
	"device_id" uuid,
	"opened_by" uuid,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opening_float_cents" integer NOT NULL,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"counted_cash_cents" integer,
	"expected_cash_cents" integer,
	"difference_cents" integer,
	"denominations" jsonb,
	"z_report_number" integer,
	"z_totals" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_sessions_float" CHECK ("cash_sessions"."opening_float_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "checkins" ADD COLUMN "client_id" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "merged_into_id" uuid;--> statement-breakpoint
ALTER TABLE "refunds_v2" ADD COLUMN "cash_session_id" uuid;--> statement-breakpoint
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_order_id_orders_v2_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_saved_views" ADD CONSTRAINT "admin_saved_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_counters" ADD CONSTRAINT "cash_counters_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sales" ADD CONSTRAINT "cash_sales_order_id_orders_v2_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sales" ADD CONSTRAINT "cash_sales_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sales" ADD CONSTRAINT "cash_sales_cash_session_id_cash_sessions_id_fk" FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sales" ADD CONSTRAINT "cash_sales_register_id_cash_registers_id_fk" FOREIGN KEY ("register_id") REFERENCES "public"."cash_registers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sales" ADD CONSTRAINT "cash_sales_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sales" ADD CONSTRAINT "cash_sales_void_approved_by_users_id_fk" FOREIGN KEY ("void_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sales" ADD CONSTRAINT "cash_sales_void_cash_session_id_cash_sessions_id_fk" FOREIGN KEY ("void_cash_session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_register_id_cash_registers_id_fk" FOREIGN KEY ("register_id") REFERENCES "public"."cash_registers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_notes_order_idx" ON "order_notes" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_saved_views_name_unique" ON "admin_saved_views" USING btree ("user_id","scope","name");--> statement-breakpoint
CREATE INDEX "cash_registers_edition_idx" ON "cash_registers" USING btree ("edition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_registers_edition_name_unique" ON "cash_registers" USING btree ("edition_id","name");--> statement-breakpoint
CREATE INDEX "cash_sales_session_idx" ON "cash_sales" USING btree ("cash_session_id");--> statement-breakpoint
CREATE INDEX "cash_sales_edition_number_idx" ON "cash_sales" USING btree ("edition_id","number");--> statement-breakpoint
CREATE INDEX "cash_sales_flagged_idx" ON "cash_sales" USING btree ("edition_id") WHERE "cash_sales"."oversold" OR "cash_sales"."after_close";--> statement-breakpoint
CREATE INDEX "cash_sessions_edition_idx" ON "cash_sessions" USING btree ("edition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_sessions_one_open_per_register" ON "cash_sessions" USING btree ("register_id") WHERE "cash_sessions"."closed_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "cash_sessions_z_number_unique" ON "cash_sessions" USING btree ("edition_id","z_report_number");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_merged_into_id_customers_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checkins_client_id_unique" ON "checkins" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "checkins_at_idx" ON "checkins" USING btree ("at");--> statement-breakpoint
CREATE INDEX "orders_v2_created_idx" ON "orders_v2" USING btree ("created_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "orders_v2_edition_created_idx" ON "orders_v2" USING btree ("edition_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_v2_session_idx" ON "orders_v2" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "payments_cash_session_idx" ON "payments" USING btree ("cash_session_id");