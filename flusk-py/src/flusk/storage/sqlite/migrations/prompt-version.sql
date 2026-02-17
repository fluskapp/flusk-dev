CREATE TABLE IF NOT EXISTS prompt_versions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  template_id TEXT NOT NULL,
  version REAL NOT NULL,
  content TEXT NOT NULL,
  metrics TEXT NOT NULL DEFAULT '{"avgQuality":0,"avgLatencyMs":0,"avgCost":0,"sampleCount":0}',
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (template_id) REFERENCES prompt_templates(id)
);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_template_id ON prompt_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_created_at ON prompt_versions(created_at);