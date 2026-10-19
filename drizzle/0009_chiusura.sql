CREATE TABLE "edition_closing_skips" (
	"edition_id" uuid NOT NULL,
	"check_key" text NOT NULL,
	"reason" text NOT NULL,
	"skipped_by" uuid,
	"skipped_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "edition_closing_skips_edition_id_check_key_pk" PRIMARY KEY("edition_id","check_key")
);
--> statement-breakpoint
CREATE TABLE "edition_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"summary" jsonb NOT NULL,
	"csv" text NOT NULL,
	"pdf_base64" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "edition_closing_skips" ADD CONSTRAINT "edition_closing_skips_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_closing_skips" ADD CONSTRAINT "edition_closing_skips_skipped_by_users_id_fk" FOREIGN KEY ("skipped_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_reports" ADD CONSTRAINT "edition_reports_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_reports" ADD CONSTRAINT "edition_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "edition_reports_edition_idx" ON "edition_reports" USING btree ("edition_id","created_at" DESC NULLS LAST);