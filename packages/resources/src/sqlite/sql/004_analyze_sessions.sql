CREATE TABLE IF NOT EXISTS analyze_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  script TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  models_used TEXT NOT NULL DEFAULT '[]',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
