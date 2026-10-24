CREATE TYPE "public"."order_channel" AS ENUM('online', 'pos', 'paylink', 'invite', 'admin');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'partially_refunded', 'refunded', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('nexi', 'cash', 'card_pos', 'complimentary', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."refund_method" AS ENUM('bank_transfer', 'nexi', 'cash');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('requested', 'approved', 'paid', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('valid', 'void');--> statement-breakpoint
CREATE TABLE "attendee_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"ticket_id" uuid,
	"question_key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkin_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"product_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"session_id" uuid,
	"allow_multiple" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"checkin_list_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"operator_id" uuid,
	"device_id" uuid,
	"reverted_at" timestamp with time zone,
	"reverted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"phone" text,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_lowercase" CHECK ("customers"."email" = lower("customers"."email"))
);
--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"session_id" uuid,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"department" text,
	"prep_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_lines_quantity" CHECK ("order_lines"."quantity" > 0),
	CONSTRAINT "order_lines_total" CHECK ("order_lines"."total_cents" = "order_lines"."unit_price_cents" * "order_lines"."quantity" - "order_lines"."discount_cents" AND "order_lines"."total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "orders_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"edition_id" uuid NOT NULL,
	"customer_id" uuid,
	"channel" "order_channel" NOT NULL,
	"status" "order_status" NOT NULL,
	"session_id" uuid,
	"subtotal_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"discount_id" uuid,
	"cash_session_id" uuid,
	"operator_id" uuid,
	"device_id" uuid,
	"parent_order_id" uuid,
	"access_token" text NOT NULL,
	"idempotency_key" text,
	"is_blacklisted" boolean DEFAULT false NOT NULL,
	"blacklist_reason" text,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_v2_total" CHECK ("orders_v2"."total_cents" = "orders_v2"."subtotal_cents" - "orders_v2"."discount_cents" AND "orders_v2"."total_cents" >= 0 AND "orders_v2"."discount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "payment_status" NOT NULL,
	"provider_ref" text,
	"raw" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cash_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount" CHECK ("payments"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "refunds_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text,
	"method" "refund_method" NOT NULL,
	"status" "refund_status" DEFAULT 'requested' NOT NULL,
	"iban_encrypted" text,
	"holder_name" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"processed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_v2_amount" CHECK ("refunds_v2"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "tickets_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"order_line_id" uuid NOT NULL,
	"edition_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"session_id" uuid,
	"qr_token" text NOT NULL,
	"attendee_name" text,
	"status" "ticket_status" DEFAULT 'valid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendee_answers" ADD CONSTRAINT "attendee_answers_order_id_orders_v2_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendee_answers" ADD CONSTRAINT "attendee_answers_ticket_id_tickets_v2_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_lists" ADD CONSTRAINT "checkin_lists_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_lists" ADD CONSTRAINT "checkin_lists_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_ticket_id_tickets_v2_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_checkin_list_id_checkin_lists_id_fk" FOREIGN KEY ("checkin_list_id") REFERENCES "public"."checkin_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_reverted_by_users_id_fk" FOREIGN KEY ("reverted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_v2_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders_v2" ADD CONSTRAINT "orders_v2_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders_v2" ADD CONSTRAINT "orders_v2_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders_v2" ADD CONSTRAINT "orders_v2_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders_v2" ADD CONSTRAINT "orders_v2_discount_id_discounts_v2_id_fk" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders_v2" ADD CONSTRAINT "orders_v2_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders_v2" ADD CONSTRAINT "orders_v2_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders_v2" ADD CONSTRAINT "orders_v2_parent_order_id_orders_v2_id_fk" FOREIGN KEY ("parent_order_id") REFERENCES "public"."orders_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_v2_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds_v2" ADD CONSTRAINT "refunds_v2_order_id_orders_v2_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds_v2" ADD CONSTRAINT "refunds_v2_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets_v2" ADD CONSTRAINT "tickets_v2_order_id_orders_v2_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders_v2"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets_v2" ADD CONSTRAINT "tickets_v2_order_line_id_order_lines_id_fk" FOREIGN KEY ("order_line_id") REFERENCES "public"."order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets_v2" ADD CONSTRAINT "tickets_v2_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets_v2" ADD CONSTRAINT "tickets_v2_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets_v2" ADD CONSTRAINT "tickets_v2_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendee_answers_order_idx" ON "attendee_answers" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "checkin_lists_edition_idx" ON "checkin_lists" USING btree ("edition_id");--> statement-breakpoint
CREATE INDEX "checkins_ticket_list_idx" ON "checkins" USING btree ("ticket_id","checkin_list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_unique" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "order_lines_order_idx" ON "order_lines" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_lines_product_session_idx" ON "order_lines" USING btree ("product_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_v2_code_unique" ON "orders_v2" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_v2_access_token_unique" ON "orders_v2" USING btree ("access_token");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_v2_idempotency_unique" ON "orders_v2" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "orders_v2_edition_status_idx" ON "orders_v2" USING btree ("edition_id","status");--> statement-breakpoint
CREATE INDEX "orders_v2_customer_idx" ON "orders_v2" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_v2_expiry_idx" ON "orders_v2" USING btree ("expires_at") WHERE "orders_v2"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_ref_unique" ON "payments" USING btree ("provider_ref");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "refunds_v2_order_idx" ON "refunds_v2" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "refunds_v2_status_idx" ON "refunds_v2" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_v2_qr_unique" ON "tickets_v2" USING btree ("qr_token");--> statement-breakpoint
CREATE INDEX "tickets_v2_order_idx" ON "tickets_v2" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "tickets_v2_edition_idx" ON "tickets_v2" USING btree ("edition_id");