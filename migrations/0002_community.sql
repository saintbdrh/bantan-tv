CREATE TABLE IF NOT EXISTS request_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tetris_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  seed INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  score INTEGER,
  lines INTEGER
);
CREATE INDEX IF NOT EXISTS tetris_leaderboard ON tetris_runs(score DESC) WHERE completed_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS trees (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  title TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tree_ornaments (
  id TEXT PRIMARY KEY,
  tree_id TEXT NOT NULL REFERENCES trees(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  slot INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 24),
  kind TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE(tree_id, slot)
);
CREATE INDEX IF NOT EXISTS ornaments_tree ON tree_ornaments(tree_id, author_id);
