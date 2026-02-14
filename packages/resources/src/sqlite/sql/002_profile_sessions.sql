CREATE TABLE IF NOT EXISTS profile_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cpu', 'heap')),
  duration_ms INTEGER NOT NULL DEFAULT 0,
  total_samples INTEGER NOT NULL DEFAULT 0,
  hotspots TEXT NOT NULL DEFAULT '[]',
  markdown_raw TEXT NOT NULL DEFAULT '',
  pprof_path TEXT NOT NULL DEFAULT '',
  flamegraph_path TEXT NOT NULL DEFAULT '',
  trace_ids TEXT NOT NULL DEFAULT '[]',
  organization_id TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_profile_sessions_started ON profile_sessions(started_at);
