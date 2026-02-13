CREATE TABLE IF NOT EXISTS performance_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_session_id UUID NOT NULL REFERENCES profile_sessions(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  description TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  organization_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perf_patterns_session ON performance_patterns(profile_session_id);
CREATE INDEX idx_perf_patterns_org ON performance_patterns(organization_id);
CREATE INDEX idx_perf_patterns_severity ON performance_patterns(severity);
