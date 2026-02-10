-- Add GDPR consent tracking fields to llm_calls table

ALTER TABLE llm_calls
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_purpose VARCHAR(100) DEFAULT 'optimization',
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);

-- Index for consent queries
CREATE INDEX IF NOT EXISTS idx_llm_calls_consent
  ON llm_calls(consent_given, consent_purpose);

-- Index for GDPR data export and deletion
CREATE INDEX IF NOT EXISTS idx_llm_calls_organization
  ON llm_calls(organization_id);
