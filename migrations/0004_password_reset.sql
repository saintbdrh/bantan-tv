ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  delivered INTEGER NOT NULL DEFAULT 0,
  consumed_at INTEGER,
  claim_token TEXT
);
CREATE INDEX password_resets_user ON password_resets(user_id, created_at);
CREATE INDEX password_resets_expiry ON password_resets(expires_at);
