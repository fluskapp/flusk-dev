-- Create patterns table
CREATE TABLE patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ownership
  organization_id UUID NOT NULL,

  -- Pattern identification
  prompt_hash CHAR(64) NOT NULL,

  -- Occurrence tracking
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count >= 1),
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,

  -- Sample data for review
  sample_prompts TEXT[] NOT NULL DEFAULT '{}',

  -- Cost analysis
  avg_cost DECIMAL(10, 6) NOT NULL CHECK (avg_cost >= 0),
  total_cost DECIMAL(10, 6) NOT NULL CHECK (total_cost >= 0),

  -- Conversion suggestions
  suggested_conversion TEXT,

  -- Ensure unique pattern per organization per hash
  CONSTRAINT unique_org_pattern UNIQUE (organization_id, prompt_hash)
);

-- Index for organization lookups
CREATE INDEX idx_patterns_organization_id ON patterns(organization_id);

-- Index for prompt hash lookups
CREATE INDEX idx_patterns_prompt_hash ON patterns(prompt_hash);

-- Index for finding high-occurrence patterns (optimization opportunities)
CREATE INDEX idx_patterns_occurrence_count ON patterns(occurrence_count DESC);

-- Index for finding high-cost patterns
CREATE INDEX idx_patterns_total_cost ON patterns(total_cost DESC);

-- Index for time-series analysis
CREATE INDEX idx_patterns_last_seen ON patterns(last_seen_at DESC);

-- Update updated_at trigger (reuse function from 001_create_llm_calls.sql)
CREATE TRIGGER update_patterns_updated_at
  BEFORE UPDATE ON patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
