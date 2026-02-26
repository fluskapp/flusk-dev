CREATE TABLE IF NOT EXISTS training_datasets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT,
  name TEXT NOT NULL,
  source_model TEXT NOT NULL,
  target_model TEXT,
  pair_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'collecting',
  cluster_summary TEXT NOT NULL DEFAULT '{}',
  export_format TEXT NOT NULL DEFAULT 'jsonl',
  export_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_training_datasets_tenant_id ON training_datasets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_datasets_created_at ON training_datasets(created_at);