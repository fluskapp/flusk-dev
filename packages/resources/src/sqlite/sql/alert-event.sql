CREATE TABLE IF NOT EXISTS alert_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel_name TEXT,
  delivered INTEGER NOT NULL DEFAULT 0,
  acknowledged_at TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alert_events_created_at ON alert_events(created_at);