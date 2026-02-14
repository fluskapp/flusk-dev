CREATE TABLE IF NOT EXISTS performance_patterns (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  profile_session_id TEXT NOT NULL,
  pattern TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  description TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  organization_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_session_id) REFERENCES profile_sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_patterns_profile ON performance_patterns(profile_session_id);
CREATE INDEX IF NOT EXISTS idx_patterns_severity ON performance_patterns(severity);
