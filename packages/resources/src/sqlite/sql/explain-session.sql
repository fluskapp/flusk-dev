-- @generated from packages/schema/entities/explain-session.entity.yaml
-- Generated: 2026-02-18T12:47:00.000Z
-- DO NOT EDIT generated sections — changes will be overwritten.

CREATE TABLE IF NOT EXISTS explain_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  analyze_session_id TEXT NOT NULL,
  llm_provider TEXT NOT NULL,
  llm_model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  explain_cost REAL NOT NULL DEFAULT 0,
  insights_count INTEGER NOT NULL DEFAULT 0,
  total_savings REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_explain_sessions_analyze_session_id ON explain_sessions(analyze_session_id);
CREATE INDEX IF NOT EXISTS idx_explain_sessions_created_at ON explain_sessions(created_at);
