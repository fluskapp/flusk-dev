CREATE TABLE IF NOT EXISTS profile_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cpu', 'heap')),
  duration_ms INTEGER NOT NULL,
  total_samples INTEGER NOT NULL DEFAULT 0,
  hotspots JSONB NOT NULL DEFAULT '[]',
  markdown_raw TEXT NOT NULL DEFAULT '',
  pprof_path TEXT NOT NULL DEFAULT '',
  flamegraph_path TEXT NOT NULL DEFAULT '',
  trace_ids TEXT[] NOT NULL DEFAULT '{}',
  organization_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profile_sessions_org ON profile_sessions(organization_id);
CREATE INDEX idx_profile_sessions_type ON profile_sessions(type);
CREATE INDEX idx_profile_sessions_started ON profile_sessions(started_at);
