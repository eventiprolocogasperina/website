-- Prompt 17 (sito pubblico). Menu, calendario e schede nuove (/eventi, /eventi/[slug], home) solo con il
-- flag public_v2 = "true": di default spento, il sito resta quello di oggi.
-- La categoria dell'edizione arriva dall'evento di oggi collegato (legacy_id_map), solo se vuota.
-- Rollback: DELETE FROM "site_settings" WHERE "key" IN ('public_v2', 'public_nav'); UPDATE "editions" SET "category" = NULL;
INSERT INTO "site_settings" ("key", "value")
VALUES ('public_v2', 'false')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
UPDATE "editions" e
SET "category" = ev."category"
FROM "legacy_id_map" m
JOIN "events" ev ON ev."id" = m."legacy_id"
WHERE m."legacy_kind" = 'event'
  AND m."new_id" = e."id"
  AND e."category" IS NULL
  AND ev."category" IN ('cultura', 'musica', 'gastronomia', 'sport', 'comunità');
