CREATE TABLE IF NOT EXISTS routing_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  quality_threshold REAL NOT NULL,
  fallback_model TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_routing_rules_organization_id ON routing_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_routing_rules_created_at ON routing_rules(created_at);