ALTER TABLE "checkins" ADD COLUMN "client_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "checkins_client_id_unique" ON "checkins" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "checkins_at_idx" ON "checkins" USING btree ("at");