-- Prompt 17b: le pagine a blocchi di /zuccaland e /assaggia-e-passeggia prendono il posto di quelle di
-- oggi solo quando il flag diventa "true" (§18.10: Zuccaland 2026 in vendita fino al 25 ottobre).
-- I contenuti si convertono con scripts/convert-pages-to-blocks.ts, non qui: dipendono da pages_content.
-- Rollback: DELETE FROM "site_settings" WHERE "key" = 'public_v2';
INSERT INTO "site_settings" ("key", "value")
VALUES ('public_v2', 'false')
ON CONFLICT ("key") DO NOTHING;
