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
  organization_id TEXT,
  agent_label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_llm_calls_hash ON llm_calls(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_llm_calls_model ON llm_calls(model);
CREATE INDEX IF NOT EXISTS idx_llm_calls_agent ON llm_calls(agent_label);
CREATE INDEX IF NOT EXISTS idx_llm_calls_created ON llm_calls(created_at);
