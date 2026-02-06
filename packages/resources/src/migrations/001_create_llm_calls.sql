-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create llm_calls table
CREATE TABLE llm_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- LLM call metadata
  provider VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,

  -- Prompt data
  prompt TEXT NOT NULL,
  prompt_hash CHAR(64) NOT NULL,

  -- Token usage (stored as JSONB for flexibility)
  tokens JSONB NOT NULL,

  -- Cost tracking
  cost DECIMAL(10, 6) NOT NULL CHECK (cost >= 0),

  -- Response data
  response TEXT NOT NULL,
  cached BOOLEAN NOT NULL DEFAULT false
);

-- Index for cache lookups (most critical performance path)
CREATE INDEX idx_llm_calls_prompt_hash ON llm_calls(prompt_hash);

-- Index for provider/model analytics
CREATE INDEX idx_llm_calls_provider_model ON llm_calls(provider, model);

-- Index for cost analysis and time-series queries
CREATE INDEX idx_llm_calls_created_at ON llm_calls(created_at DESC);

-- Index for cache hit rate analysis
CREATE INDEX idx_llm_calls_cached ON llm_calls(cached) WHERE cached = true;

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_llm_calls_updated_at
  BEFORE UPDATE ON llm_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
