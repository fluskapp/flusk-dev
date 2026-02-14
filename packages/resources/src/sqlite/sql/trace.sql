CREATE TABLE IF NOT EXISTS traces (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  total_cost REAL NOT NULL,
  total_tokens REAL NOT NULL,
  total_latency_ms REAL NOT NULL,
  call_count REAL NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_traces_organization_id ON traces(organization_id);
CREATE INDEX IF NOT EXISTS idx_traces_created_at ON traces(created_at);