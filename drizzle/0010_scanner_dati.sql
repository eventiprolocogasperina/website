-- Prompt 15: lo scanner nuovo prende il posto di quello di oggi su /scanner solo quando questo flag
-- diventa "true" (Admin › Check-in › Dispositivi). Finché resta "false" /scanner è lo scanner di oggi
-- e lo scanner nuovo si prova su /scanner/nuovo.
INSERT INTO "site_settings" ("key", "value")
VALUES ('scanner_v2', 'false')
ON CONFLICT ("key") DO NOTHING;
