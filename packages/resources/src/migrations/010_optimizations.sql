CREATE TABLE IF NOT EXISTS optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('cache-config', 'model-swap', 'prompt-dedup', 'batch-merge')),
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  estimated_savings_per_month NUMERIC(10, 2) NOT NULL DEFAULT 0,
  generated_code TEXT NOT NULL DEFAULT '',
  language VARCHAR(20) NOT NULL DEFAULT 'typescript' CHECK (language IN ('typescript', 'python', 'json')),
  status VARCHAR(20) NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'applied', 'dismissed')),
  source_pattern_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optimizations_org ON optimizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_optimizations_status ON optimizations(status);
