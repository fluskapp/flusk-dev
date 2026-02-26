CREATE TABLE IF NOT EXISTS training_pairs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT,
  source_model TEXT NOT NULL,
  source_provider TEXT NOT NULL,
  prompt TEXT NOT NULL,
  completion TEXT NOT NULL,
  system_prompt TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  quality TEXT NOT NULL DEFAULT 'unrated',
  cluster TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_training_pairs_tenant_id ON training_pairs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_pairs_source_model ON training_pairs(source_model);
CREATE INDEX IF NOT EXISTS idx_training_pairs_cluster ON training_pairs(cluster);
CREATE INDEX IF NOT EXISTS idx_training_pairs_created_at ON training_pairs(created_at);