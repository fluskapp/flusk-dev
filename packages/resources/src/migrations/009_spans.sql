CREATE TABLE IF NOT EXISTS spans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
  parent_span_id UUID REFERENCES spans(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  input TEXT,
  output TEXT,
  cost NUMERIC(12, 6) NOT NULL DEFAULT 0,
  tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spans_trace_id ON spans(trace_id);
CREATE INDEX idx_spans_parent_span_id ON spans(parent_span_id);
