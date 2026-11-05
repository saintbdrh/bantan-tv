-- Accounts and ad bookings (previously data/users.json and data/bookings.json).
-- Apply with: npm run db:migrate:remote   (or paste into the D1 console)

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id               TEXT PRIMARY KEY,
  created_at       TEXT NOT NULL,
  status           TEXT NOT NULL,          -- pending | forwarded | error
  forward_error    TEXT,
  advertiser_name  TEXT NOT NULL,
  advertiser_phone TEXT NOT NULL,
  advertiser_email TEXT NOT NULL,
  company          TEXT,
  slot_id          TEXT,
  slot_start       TEXT NOT NULL,
  slot_end         TEXT NOT NULL,
  pricing_type     TEXT NOT NULL,          -- free | peak
  days             TEXT NOT NULL,          -- JSON array
  times            TEXT NOT NULL,          -- JSON object
  total_price      REAL NOT NULL DEFAULT 0,
  tvc_file_name    TEXT,
  note             TEXT
);

CREATE INDEX IF NOT EXISTS bookings_created_at ON bookings (created_at);
