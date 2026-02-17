CREATE TABLE IF NOT EXISTS spans (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  trace_id TEXT NOT NULL,
  parent_span_id TEXT,
  span_type TEXT NOT NULL,
  name TEXT NOT NULL,
  input TEXT,
  output TEXT,
  cost REAL NOT NULL,
  tokens REAL NOT NULL,
  latency_ms REAL NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (trace_id) REFERENCES traces(id)
);
CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_spans_created_at ON spans(created_at);