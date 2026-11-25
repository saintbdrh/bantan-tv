-- Existing accounts must prove ownership on their next login as well.
ALTER TABLE users ADD COLUMN email_verified_at TEXT;

CREATE TABLE email_verifications (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  send_count INTEGER NOT NULL DEFAULT 1,
  last_sent_at INTEGER NOT NULL,
  generation TEXT NOT NULL,
  delivery_state TEXT NOT NULL DEFAULT 'sending',
  consumed_at INTEGER,
  claim_token TEXT
);
CREATE INDEX email_verifications_expiry ON email_verifications(expires_at);
