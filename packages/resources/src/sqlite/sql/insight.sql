-- @generated from packages/schema/entities/insight.entity.yaml
-- Generated: 2026-02-18T12:47:00.000Z
-- DO NOT EDIT generated sections — changes will be overwritten.

CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('cost-hotspot','duplicate-calls','token-waste','model-downgrade','caching-opportunity','error-rate')),
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  current_cost REAL NOT NULL DEFAULT 0,
  projected_cost REAL NOT NULL DEFAULT 0,
  savings_percent REAL NOT NULL DEFAULT 0,
  code_suggestion TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_insights_session_id ON insights(session_id);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(created_at);
