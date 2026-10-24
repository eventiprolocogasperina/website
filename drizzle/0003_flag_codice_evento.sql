-- Prompt 07: il codice evento della cassa resta valido come alternativa a dispositivo + PIN
-- finché il prompt 14 non lo sostituisce. "false" lo spegne.
INSERT INTO "site_settings" ("key", "value")
VALUES ('legacy_event_code', 'true')
ON CONFLICT ("key") DO NOTHING;
