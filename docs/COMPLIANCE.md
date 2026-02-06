# GDPR & SOC2 Compliance Guide

## GDPR Compliance

Flusk implements all GDPR requirements for data protection and user rights.

### Data Encryption (Article 32)

**Encryption at Rest:**
- AES-256-GCM encryption for all PII
- Prompts and responses encrypted before storage
- Encryption keys managed securely via environment variables

**Implementation:**
```typescript
// Automatic encryption on create
import { encrypt } from '@flusk/resources';

const encryptedPrompt = encrypt(userPrompt);
const encryptedResponse = encrypt(llmResponse);
```

### Right to Deletion (Article 17)

Users can request complete deletion of their data.

**Hard Delete Endpoint:**
```bash
DELETE /gdpr/user/:orgId
Authorization: Bearer orgId_secretKey
```

**What Gets Deleted:**
- All LLM call records
- All detected patterns
- All conversion recommendations
- Associated metadata

**Cascade Behavior:**
- Foreign key constraints ensure complete deletion
- No orphaned records remain

**Response:**
```json
{
  "deleted": {
    "llmCalls": 1234,
    "patterns": 56,
    "conversions": 78
  }
}
```

### Right to Data Portability (Article 20)

Users can export all their data in machine-readable format.

**Export Endpoint:**
```bash
GET /gdpr/user/:orgId/data
Authorization: Bearer orgId_secretKey
```

**Response Format (JSON):**
```json
{
  "organizationId": "org_123",
  "exportedAt": "2024-01-15T10:30:00Z",
  "data": {
    "llmCalls": [...],
    "patterns": [...],
    "conversions": [...]
  },
  "metadata": {
    "totalLlmCalls": 1234,
    "totalPatterns": 56,
    "totalConversions": 78
  }
}
```

### Consent Management (Article 7)

**Consent Fields:**
- `consent_given`: Boolean flag for data processing consent
- `consent_purpose`: Purpose of processing (optimization, analytics, training)

**Consent Withdrawal:**
Users can withdraw consent by:
1. Updating consent flags via API
2. Requesting hard deletion (Article 17)

**Implementation:**
```typescript
// Track consent on LLM call
await LLMCallRepository.create({
  ...llmCallData,
  consentGiven: true,
  consentPurpose: 'optimization'
});
```

### Data Minimization (Article 5)

**Principle:**
- Only collect data necessary for service functionality
- No excessive data retention
- Prompts/responses only stored for optimization

**Retention Policy:**
- Default: 90 days for LLM call data
- Users can configure shorter retention
- Auto-deletion jobs run daily

### Data Protection by Design (Article 25)

**Security Measures:**
- Encryption by default
- Organization-scoped data isolation
- Audit logging for all access
- Minimal data collection

## SOC2 Compliance

Flusk implements SOC2 Trust Service Criteria controls.

### Security (CC6.1 - CC6.7)

**Access Controls:**
- API key authentication required
- Organization-scoped authorization
- Role-based access control (RBAC) ready

**Audit Logging:**
```typescript
import { logAudit } from '@flusk/resources';

await logAudit({
  action: 'read',
  resource: 'llm_calls',
  resourceId: callId,
  organizationId: orgId,
  userId: userId,
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
  success: true,
  errorMessage: null,
  metadata: { query: 'findById' }
});
```

**Logged Events:**
- All CRUD operations
- Authentication attempts (success/failure)
- Data exports and deletions
- API key usage

### Availability (CC7.1 - CC7.2)

**Monitoring:**
- Health check endpoint: `GET /health`
- Database connection monitoring
- Redis cache monitoring

**Backup & Recovery:**
- PostgreSQL automated backups (daily)
- Point-in-time recovery (PITR) enabled
- RTO: 4 hours, RPO: 1 hour

### Processing Integrity (CC8.1)

**Data Validation:**
- TypeBox schema validation on all inputs
- SQL injection prevention (parameterized queries)
- Hash verification for data integrity

**Error Handling:**
- Structured error responses
- No sensitive data in error messages
- All errors logged for analysis

### Confidentiality (CC9.1 - CC9.2)

**Data Protection:**
- Encryption at rest (AES-256-GCM)
- Encryption in transit (TLS 1.3)
- Encryption key rotation every 90 days

**Access Restrictions:**
- Organization-scoped data access
- No cross-organization queries
- Principle of least privilege

### Privacy (P1.1 - P8.1)

**Notice & Consent:**
- Users informed of data collection
- Explicit consent tracked per record
- Consent withdrawal supported

**Data Lifecycle:**
- Collection: Only necessary data
- Use: Purpose-limited (optimization)
- Retention: 90-day default policy
- Disposal: Secure deletion on request

## Compliance Checklist

### GDPR Requirements
- [x] Encryption at rest and in transit
- [x] Right to deletion (hard delete)
- [x] Right to data portability (export)
- [x] Consent management
- [x] Data minimization
- [x] Security by design
- [ ] Data Processing Agreement (DPA) template
- [ ] Privacy Policy documentation

### SOC2 Requirements
- [x] Audit logging for all access
- [x] Access controls and authentication
- [x] Encryption key management
- [x] Data integrity validation
- [x] Error handling and monitoring
- [ ] Annual penetration testing
- [ ] Vendor risk assessment
- [ ] Incident response plan

## Implementation Guide

### 1. Run Migrations
```bash
# Apply GDPR/SOC2 schema changes
psql $DATABASE_URL -f packages/resources/src/migrations/004_audit_logs.sql
psql $DATABASE_URL -f packages/resources/src/migrations/005_add_consent_fields.sql
```

### 2. Set Encryption Key
```bash
# Generate secure encryption key (32 bytes)
export ENCRYPTION_KEY=$(openssl rand -base64 32)

# Add to production environment
fly secrets set ENCRYPTION_KEY="your-key-here"
```

### 3. Enable Audit Logging
```typescript
// Add to middleware
import { logAudit } from '@flusk/resources';

// Log all API calls
fastify.addHook('onResponse', async (request, reply) => {
  await logAudit({
    action: request.method,
    resource: request.routerPath,
    // ... other fields
  });
});
```

### 4. Register GDPR Routes
```typescript
// Add to app.ts
import gdprRoutes from './routes/gdpr.routes.js';

await fastify.register(gdprRoutes);
```

## Annual Compliance Tasks

### Q1
- Security audit and penetration testing
- Review encryption key rotation policy

### Q2
- Update DPA and privacy policy
- Vendor risk assessment

### Q3
- SOC2 audit preparation
- Incident response drill

### Q4
- Year-end compliance review
- Update documentation

## Resources

- **GDPR:** https://gdpr.eu/
- **SOC2:** https://www.aicpa.org/soc
- **Security Contact:** security@flusk.ai
