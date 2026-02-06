-- Create audit_logs table for SOC2 compliance
-- Tracks all access and modifications for security auditing

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Action details
  action VARCHAR(100) NOT NULL,           -- e.g., 'read', 'create', 'update', 'delete'
  resource VARCHAR(100) NOT NULL,         -- e.g., 'llm_calls', 'patterns', 'conversions'
  resource_id UUID,                       -- ID of the affected resource

  -- Actor information
  organization_id VARCHAR(255) NOT NULL,  -- Organization performing action
  user_id VARCHAR(255),                   -- User ID if available

  -- Request metadata
  ip_address INET,                        -- Client IP address
  user_agent TEXT,                        -- Client user agent

  -- Result
  success BOOLEAN NOT NULL DEFAULT true,  -- Whether action succeeded
  error_message TEXT,                     -- Error details if failed

  -- Additional context
  metadata JSONB                          -- Flexible JSON for extra data
);

-- Index for querying by organization
CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id, created_at DESC);

-- Index for querying by resource
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);

-- Index for security analysis (failed attempts)
CREATE INDEX idx_audit_logs_failures ON audit_logs(success, created_at DESC) WHERE success = false;

-- Index for time-series queries
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
