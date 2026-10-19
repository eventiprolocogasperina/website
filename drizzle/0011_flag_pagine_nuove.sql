-- Prompt 12 e 15: le pagine nuove di ordini/rimborsi/partecipanti e lo scanner nuovo prendono il posto
-- di quelli di oggi solo quando il flag diventa "true". Di default spenti.
-- Rollback: DELETE FROM "site_settings" WHERE "key" IN ('orders_v2', 'scanner_v2');
INSERT INTO "site_settings" ("key", "value")
VALUES ('orders_v2', 'false'), ('scanner_v2', 'false')
ON CONFLICT ("key") DO NOTHING;
