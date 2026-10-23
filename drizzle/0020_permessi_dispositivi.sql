-- Permessi dei dispositivi da campo: cassa assegnata, a chi è affidato (nome e telefono) e permessi
-- scelti all'abbinamento, su device_pairings e devices. Solo aggiunte; permissions NULL = ruolo di prima.
-- Rollback: ALTER TABLE "devices" DROP COLUMN "register_id", DROP COLUMN "holder_name", DROP COLUMN "holder_phone",
-- DROP COLUMN "permissions"; ALTER TABLE "device_pairings" DROP COLUMN "register_id", DROP COLUMN "holder_name",
-- DROP COLUMN "holder_phone", DROP COLUMN "permissions".
ALTER TABLE "device_pairings" ADD COLUMN "register_id" uuid;--> statement-breakpoint
ALTER TABLE "device_pairings" ADD COLUMN "holder_name" text;--> statement-breakpoint
ALTER TABLE "device_pairings" ADD COLUMN "holder_phone" text;--> statement-breakpoint
ALTER TABLE "device_pairings" ADD COLUMN "permissions" text[];--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "register_id" uuid;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "holder_name" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "holder_phone" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "permissions" text[];
