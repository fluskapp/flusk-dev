-- Add GDPR consent tracking fields to llm_calls table
-- Supports consent management and data processing transparency

ALTER TABLE llm_calls
  ADD COLUMN consent_given BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN consent_purpose VARCHAR(100) DEFAULT 'optimization';

-- Index for consent queries
CREATE INDEX idx_llm_calls_consent ON llm_calls(consent_given, consent_purpose);

-- Add organization_id for data portability and deletion
ALTER TABLE llm_calls
  ADD COLUMN organization_id VARCHAR(255);

-- Backfill organization_id from API key if needed (manual step)
-- UPDATE llm_calls SET organization_id = 'default' WHERE organization_id IS NULL;

-- Make organization_id required after backfill
-- ALTER TABLE llm_calls ALTER COLUMN organization_id SET NOT NULL;

-- Index for GDPR data export and deletion
CREATE INDEX idx_llm_calls_organization ON llm_calls(organization_id);

-- Similarly update patterns table
ALTER TABLE patterns
  ADD COLUMN organization_id VARCHAR(255);

CREATE INDEX idx_patterns_organization ON patterns(organization_id);

-- Update conversions table
ALTER TABLE conversions
  ADD COLUMN organization_id VARCHAR(255);

CREATE INDEX idx_conversions_organization ON conversions(organization_id);
