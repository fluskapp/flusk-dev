-- Create conversions table for optimization suggestions
CREATE TABLE conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign keys
  pattern_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Conversion details
  conversion_type VARCHAR(50) NOT NULL CHECK (conversion_type IN ('cache', 'downgrade', 'remove')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('suggested', 'accepted', 'rejected')),

  -- Cost analysis
  estimated_savings DECIMAL(10, 2) NOT NULL CHECK (estimated_savings >= 0),

  -- Configuration (JSONB for flexible config schemas)
  config JSONB NOT NULL
);

-- Index for finding conversions by pattern
CREATE INDEX idx_conversions_pattern_id ON conversions(pattern_id);

-- Index for finding conversions by organization
CREATE INDEX idx_conversions_organization_id ON conversions(organization_id);

-- Index for finding suggested conversions (most common query)
CREATE INDEX idx_conversions_suggested ON conversions(organization_id, status)
  WHERE status = 'suggested';

-- Index for analytics by conversion type
CREATE INDEX idx_conversions_type ON conversions(conversion_type);

-- Index for time-series queries
CREATE INDEX idx_conversions_created_at ON conversions(created_at DESC);

-- Composite index for finding active conversions by pattern
CREATE INDEX idx_conversions_pattern_status ON conversions(pattern_id, status);

-- Update trigger for updated_at
CREATE TRIGGER update_conversions_updated_at
  BEFORE UPDATE ON conversions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
