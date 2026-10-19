-- Prompt 12: le pagine nuove di ordini, rimborsi e partecipanti sostituiscono le vecchie rotte
-- (/admin/ordini, /admin/rimborsi, /admin/prenotazioni) solo con il flag acceso. Di default spento.
-- Rollback: DELETE FROM "site_settings" WHERE "key" = 'orders_v2';
INSERT INTO "site_settings" ("key", "value")
VALUES ('orders_v2', 'false')
ON CONFLICT ("key") DO NOTHING;
