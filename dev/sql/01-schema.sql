-- Schema del database LOCALE di sviluppo.
-- Ricostruito dal codice (commit 444c7d6): tabelle e colonne usate dal sito.
-- NON eseguire sul database di produzione.

CREATE TABLE IF NOT EXISTS events (
  id                 VARCHAR(255) PRIMARY KEY,
  slug               VARCHAR(255) UNIQUE NOT NULL,
  title              VARCHAR(255) NOT NULL,
  date               VARCHAR(255) NOT NULL,
  "dateLabel"        VARCHAR(255),
  time               VARCHAR(255) NOT NULL,
  location           VARCHAR(255) NOT NULL,
  category           VARCHAR(50)  NOT NULL,
  description        TEXT NOT NULL,
  "fullDescription"  TEXT NOT NULL,
  image              VARCHAR(255) NOT NULL,
  "maxParticipants"  INTEGER NOT NULL,
  "registeredCount"  INTEGER NOT NULL,
  price              INTEGER NOT NULL,
  featured           BOOLEAN NOT NULL,
  bookable           BOOLEAN NOT NULL,
  "isFree"           BOOLEAN DEFAULT FALSE,
  config             JSONB DEFAULT NULL,
  "createdAt"        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id                  VARCHAR(255) PRIMARY KEY,
  "buyerName"         VARCHAR(255) NOT NULL,
  "buyerEmail"        VARCHAR(255) NOT NULL,
  "buyerPhone"        VARCHAR(255),
  "totalAmount"       DECIMAL(10,2) NOT NULL,
  status              VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  "nexiMac"           VARCHAR(255),
  "discountId"        VARCHAR(255),
  notes               TEXT,
  "thankYouEmailSent" BOOLEAN DEFAULT FALSE,
  "isBlacklisted"     BOOLEAN DEFAULT FALSE,
  "blacklistReason"   TEXT,
  "blacklistedAt"     TIMESTAMP,
  "deletedAt"         TIMESTAMPTZ,
  "createdAt"         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "paidAt"            TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tickets (
  id            VARCHAR(255) PRIMARY KEY,
  "orderId"     VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "eventId"     VARCHAR(255) NOT NULL,
  type          VARCHAR(100) NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  "qrCodeData"  VARCHAR(255) NOT NULL UNIQUE,
  "isCheckedIn" BOOLEAN DEFAULT FALSE,
  "checkInTime" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bookings (
  id           VARCHAR(255) PRIMARY KEY,
  event_id     VARCHAR(255) NOT NULL,
  nome         VARCHAR(255) NOT NULL,
  cognome      VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  telefono     VARCHAR(255),
  partecipanti INTEGER NOT NULL DEFAULT 1,
  note         TEXT,
  stato        VARCHAR(50) NOT NULL DEFAULT 'confermato',
  "createdAt"  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "checkedIn"  BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS news (
  id            VARCHAR(255) PRIMARY KEY,
  slug          VARCHAR(255) NOT NULL UNIQUE,
  title         VARCHAR(255) NOT NULL,
  "coverImage"  TEXT,
  content       TEXT NOT NULL,
  "publishedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  author        VARCHAR(255),
  featured      BOOLEAN DEFAULT FALSE,
  config        JSONB DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS gallery (
  id          VARCHAR(255) PRIMARY KEY,
  src         TEXT NOT NULL,
  alt         TEXT NOT NULL,
  category    VARCHAR(50) NOT NULL DEFAULT 'territorio',
  width       INTEGER NOT NULL DEFAULT 1920,
  height      INTEGER NOT NULL DEFAULT 1080,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pages_content (
  slug        VARCHAR(255) PRIMARY KEY,
  content     JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discounts (
  id           VARCHAR(255) PRIMARY KEY,
  code         VARCHAR(255) NOT NULL UNIQUE,
  type         VARCHAR(50) NOT NULL,
  value        DECIMAL(10,2) NOT NULL,
  max_uses     INTEGER DEFAULT 0,
  max_tickets  INTEGER DEFAULT 0,
  current_uses INTEGER DEFAULT 0,
  expiry_date  TIMESTAMPTZ,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  applies_to   VARCHAR(50) DEFAULT 'ALL'
);

CREATE TABLE IF NOT EXISTS sponsors (
  id          VARCHAR(255) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  logo_url    TEXT NOT NULL,
  website_url TEXT,
  tier        VARCHAR(50) NOT NULL DEFAULT 'bronze',
  active      BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_settings (
  key         VARCHAR(255) PRIMARY KEY,
  value       TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cashier_orders (
  id                   VARCHAR(255) PRIMARY KEY,
  "eventId"            VARCHAR(255) NOT NULL,
  "eventName"          VARCHAR(255) NOT NULL,
  "orderNumber"        INTEGER NOT NULL,
  "cassaName"          VARCHAR(100) NOT NULL DEFAULT 'Cassa 1',
  "operatorName"       VARCHAR(100),
  "totalAmount"        DECIMAL(10,2) NOT NULL,
  "paymentMethod"      VARCHAR(50) NOT NULL,
  "cashReceived"       DECIMAL(10,2),
  "cashChange"         DECIMAL(10,2),
  "omaggioNote"        TEXT,
  items                JSONB NOT NULL,
  "departmentStatuses" JSONB,
  status               VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
  "createdAt"          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventId"   VARCHAR(255) NOT NULL,
  name        VARCHAR(255),
  rating      INTEGER NOT NULL,
  comment     TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS zuccaland_photos (
  id                   SERIAL PRIMARY KEY,
  cloudinary_public_id VARCHAR(255) NOT NULL,
  frame_name           VARCHAR(50) NOT NULL,
  status               VARCHAR(20) DEFAULT 'pending',
  created_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id               VARCHAR(255) PRIMARY KEY,
  nome             VARCHAR(255) NOT NULL,
  cognome          VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  tipo             VARCHAR(50) NOT NULL DEFAULT 'ordinario',
  "dataIscrizione" VARCHAR(50) NOT NULL,
  stato            VARCHAR(50) NOT NULL DEFAULT 'attivo',
  "createdAt"      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refund_requests (
  id              VARCHAR(255) PRIMARY KEY,
  event_slug      VARCHAR(255),
  full_name       VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  phone           VARCHAR(255),
  booking_numbers TEXT NOT NULL,
  account_holder  VARCHAR(255),
  iban            VARCHAR(64),
  reason          TEXT,
  status          VARCHAR(50) NOT NULL DEFAULT 'pending',
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
