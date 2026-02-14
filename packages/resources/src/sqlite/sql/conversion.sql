CREATE TABLE IF NOT EXISTS conversions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  pattern_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  conversion_type TEXT NOT NULL,
  status TEXT NOT NULL,
  estimated_savings REAL NOT NULL,
  config TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pattern_id) REFERENCES patterns(id)
);
CREATE INDEX IF NOT EXISTS idx_conversions_pattern_id ON conversions(pattern_id);
CREATE INDEX IF NOT EXISTS idx_conversions_organization_id ON conversions(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversions_created_at ON conversions(created_at);