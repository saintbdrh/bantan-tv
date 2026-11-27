-- Keep already-started games replayable with their original rules.
ALTER TABLE tetris_runs ADD COLUMN rules_version INTEGER NOT NULL DEFAULT 1;
