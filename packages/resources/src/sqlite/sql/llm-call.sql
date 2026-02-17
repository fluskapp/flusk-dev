-- @generated from packages/schema/entities/llm-call.entity.yaml
-- Hash: 9077ad9201a1976687249820d2cdd48e60fbf3053ce4cab90034778c2f5966ab
-- Generated: 2026-02-17T09:41:15.603Z
-- DO NOT EDIT generated sections — changes will be overwritten.

CREATE TABLE IF NOT EXISTS llm_calls (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  tokens TEXT NOT NULL DEFAULT '{}',
  cost REAL NOT NULL DEFAULT 0,
  response TEXT NOT NULL DEFAULT '',
  cached INTEGER NOT NULL DEFAULT 0,
  agent_label TEXT,
  organization_id TEXT,
  consent_given INTEGER NOT NULL DEFAULT 1,
  consent_purpose TEXT NOT NULL DEFAULT 'optimization',
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_llm_calls_model ON llm_calls(model);
CREATE INDEX IF NOT EXISTS idx_llm_calls_prompt_hash ON llm_calls(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_llm_calls_session_id ON llm_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_llm_calls_created_at ON llm_calls(created_at);