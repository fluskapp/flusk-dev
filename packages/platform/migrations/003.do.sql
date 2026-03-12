-- Migration 003: Security hardening
-- Fixes: token encryption, OAuth state, email uniqueness, tenant isolation

-- 1. Add state column for CSRF protection on OAuth flow
ALTER TABLE okta_sessions ADD COLUMN state TEXT;
ALTER TABLE okta_sessions ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'expired', 'revoked'));

-- 2. Add encryption_iv column — tokens will be AES-256-GCM encrypted at app level
-- The actual token columns stay TEXT but will hold encrypted+base64 values
-- IV stored alongside for decryption
ALTER TABLE okta_sessions ADD COLUMN encryption_iv TEXT;

-- 3. Fix email uniqueness — should be per-tenant, not global
-- SQLite can't DROP constraints, so we recreate the index
DROP INDEX IF EXISTS sqlite_autoindex_users_1;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);

-- 4. Add soft-delete filter helper index
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_active ON users(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_solutions_active ON solutions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feature_requests_active ON feature_requests(tenant_id) WHERE deleted_at IS NULL;
