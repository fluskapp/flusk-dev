CREATE TABLE IF NOT EXISTS routing_decisions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  rule_id TEXT NOT NULL,
  llm_call_id TEXT,
  selected_model TEXT NOT NULL,
  original_model TEXT NOT NULL,
  reason TEXT NOT NULL,
  cost_saved REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (rule_id) REFERENCES routing_rules(id)
);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_rule_id ON routing_decisions(rule_id);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_created_at ON routing_decisions(created_at);