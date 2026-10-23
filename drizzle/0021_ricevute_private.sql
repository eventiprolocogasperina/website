-- Ricevute dei costi private: public_id dell'asset `authenticated` su Cloudinary al posto dell'URL
-- pubblico. attachment_url resta per le ricevute già caricate (sola lettura). Solo aggiunte.
-- Rollback: ALTER TABLE "costs" DROP COLUMN "attachment_public_id", DROP COLUMN "attachment_resource_type",
-- DROP COLUMN "attachment_format".
ALTER TABLE "costs" ADD COLUMN "attachment_public_id" text;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "attachment_resource_type" text;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "attachment_format" text;
