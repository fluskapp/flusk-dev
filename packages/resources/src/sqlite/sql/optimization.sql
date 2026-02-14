CREATE TABLE IF NOT EXISTS optimizations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT NOT NULL,
  optimization_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_savings_per_month REAL NOT NULL,
  generated_code TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT NOT NULL,
  source_pattern_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_optimizations_organization_id ON optimizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_optimizations_created_at ON optimizations(created_at);