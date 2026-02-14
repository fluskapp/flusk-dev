CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  sample_prompts TEXT NOT NULL DEFAULT '[]',
  avg_cost REAL NOT NULL,
  total_cost REAL NOT NULL,
  suggested_conversion TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_patterns_organization_id ON patterns(organization_id);
CREATE INDEX IF NOT EXISTS idx_patterns_prompt_hash ON patterns(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_patterns_created_at ON patterns(created_at);