CREATE TABLE IF NOT EXISTS model_performances (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  model TEXT NOT NULL,
  prompt_category TEXT NOT NULL,
  avg_quality REAL NOT NULL,
  avg_latency_ms REAL NOT NULL,
  avg_cost_per1k_tokens REAL NOT NULL,
  sample_count INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_model_performances_model ON model_performances(model);
CREATE INDEX IF NOT EXISTS idx_model_performances_prompt_category ON model_performances(prompt_category);
CREATE INDEX IF NOT EXISTS idx_model_performances_created_at ON model_performances(created_at);