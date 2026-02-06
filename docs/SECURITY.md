# Security Documentation

## Overview
Flusk implements enterprise-grade security controls to protect customer data and ensure compliance with SOC2 requirements.

## Authentication & Authorization

### API Key Format
API keys follow the format: `orgId_secretKey`

Example: `org_abc123_xyz789secret`

### Rate Limiting
- Per-organization rate limits enforced via middleware
- Default: 100 requests per minute per organization
- Configurable via environment variables

### Access Controls
- Organization-scoped data isolation
- All queries filtered by `organization_id`
- No cross-organization data access possible

## Data Protection

### Encryption at Rest
Flusk encrypts all PII (Personally Identifiable Information) using AES-256-GCM encryption.

**Encrypted Fields:**
- LLM prompts
- LLM responses
- Any user-provided data containing PII

**Encryption Key Management:**
- Master encryption key stored in `ENCRYPTION_KEY` environment variable
- Keys rotated periodically (recommended: every 90 days)
- Use key derivation (scrypt) for additional security

**Usage:**
```typescript
import { encrypt, decrypt } from '@flusk/resources';

// Encrypt sensitive data
const encrypted = encrypt(plaintext, process.env.ENCRYPTION_KEY);

// Decrypt when needed
const plaintext = decrypt(encrypted, process.env.ENCRYPTION_KEY);
```

### Encryption in Transit
- HTTPS/TLS 1.3 required for all API endpoints
- No plain HTTP allowed in production

## Audit Logging (SOC2)

All data access and modifications are logged for security auditing.

**Logged Actions:**
- `create`, `read`, `update`, `delete` operations
- Data exports (GDPR)
- Hard deletes (GDPR)
- Failed authentication attempts

**Audit Log Fields:**
- Who: `organization_id`, `user_id`
- What: `action`, `resource`, `resource_id`
- When: `created_at` (timestamp)
- Where: `ip_address`, `user_agent`
- Result: `success`, `error_message`
- Context: `metadata` (JSON)

**Query Audit Logs:**
```sql
-- View all actions for an organization
SELECT * FROM audit_logs
WHERE organization_id = 'org_123'
ORDER BY created_at DESC;

-- Security analysis: failed attempts
SELECT * FROM audit_logs
WHERE success = false
ORDER BY created_at DESC;
```

## Input Validation

### SQL Injection Prevention
- Parameterized queries used exclusively
- No string concatenation in SQL
- PostgreSQL prepared statements

### XSS Prevention
- Input sanitization on all user-provided data
- Content-Type headers enforced
- JSON schema validation via TypeBox

## Security Headers

**Required Response Headers:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Incident Response

### Security Incident Procedure
1. **Detect**: Monitor audit logs for suspicious activity
2. **Contain**: Revoke compromised API keys immediately
3. **Investigate**: Query audit logs to determine scope
4. **Remediate**: Rotate encryption keys if necessary
5. **Notify**: Inform affected customers within 72 hours

### Contact
Security issues: security@flusk.ai

## Vulnerability Disclosure

Report security vulnerabilities to: security@flusk.ai

**Do NOT** open public GitHub issues for security vulnerabilities.

## Compliance

See [COMPLIANCE.md](./COMPLIANCE.md) for GDPR and SOC2 compliance details.
