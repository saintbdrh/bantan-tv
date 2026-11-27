-- The official tree belongs to the community, not to a synthetic login account.
-- Personal trees and their existing 25-slot constraint remain unchanged.
CREATE TABLE IF NOT EXISTS community_tree_ornaments (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id),
  slot INTEGER NOT NULL UNIQUE CHECK (slot BETWEEN 0 AND 195),
  kind TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS community_ornaments_author ON community_tree_ornaments(author_id);
