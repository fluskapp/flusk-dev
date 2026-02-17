CREATE TABLE IF NOT EXISTS budget_alerts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  alert_type TEXT NOT NULL,
  threshold REAL NOT NULL,
  actual REAL NOT NULL,
  model TEXT,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_model ON budget_alerts(model);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_created_at ON budget_alerts(created_at);