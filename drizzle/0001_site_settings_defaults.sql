-- Impostazioni predefinite che prima inseriva /api/setup a ogni apertura della dashboard.
-- Idempotente: non sovrascrive valori già presenti.
INSERT INTO "site_settings" ("key", "value")
VALUES
  ('ticket_sales_enabled', 'true'),
  ('event_date', '2026-08-10'),
  ('contact_email', 'prolocogasperina@gmail.com'),
  ('social_instagram', 'https://www.instagram.com/prolocogasperina'),
  ('social_facebook', 'https://www.facebook.com/prolocogasperina')
ON CONFLICT ("key") DO NOTHING;
