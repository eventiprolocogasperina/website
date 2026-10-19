ALTER TABLE "sessions" ADD COLUMN "rescheduled_to_session_id" uuid;--> statement-breakpoint
ALTER TABLE "orders_v2" ADD COLUMN "original_session_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_rescheduled_to_session_id_sessions_id_fk" FOREIGN KEY ("rescheduled_to_session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders_v2" ADD CONSTRAINT "orders_v2_original_session_id_sessions_id_fk" FOREIGN KEY ("original_session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Prompt 11: il modulo "attendee-questions" diventa "activities" (Attività e laboratori).
UPDATE "editions" SET "enabled_modules" = array_replace("enabled_modules", 'attendee-questions', 'activities') WHERE 'attendee-questions' = ANY("enabled_modules");--> statement-breakpoint
UPDATE "editions" SET "module_settings" = ("module_settings" - 'attendee-questions') || jsonb_build_object('activities', "module_settings"->'attendee-questions') WHERE "module_settings" ? 'attendee-questions';
