CREATE TABLE "privacy_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"resolution_note" text,
	"handled_by_user_id" uuid,
	"handled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "privacy_requests_kind" CHECK ("privacy_requests"."kind" IN ('access','rectification','erasure','restriction','portability','objection','other')),
	CONSTRAINT "privacy_requests_status" CHECK ("privacy_requests"."status" IN ('new','in_progress','done','rejected'))
);
--> statement-breakpoint
CREATE TABLE "transparency_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" jsonb NOT NULL,
	"note" text NOT NULL,
	"published_by_user_id" uuid,
	"published_by_label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_handled_by_user_id_users_id_fk" FOREIGN KEY ("handled_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transparency_versions" ADD CONSTRAINT "transparency_versions_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "privacy_requests_status_idx" ON "privacy_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "transparency_versions_created_idx" ON "transparency_versions" USING btree ("created_at");