import { Pool } from 'pg';
/**
 * PostgreSQL connection pool singleton
 */
let pool = null;
function getPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        pool = new Pool({
            connectionString,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000
        });
    }
    return pool;
}
/**
 * Log an audit event for SOC2 compliance
 * @param entry - Audit log entry (id and createdAt auto-generated)
 * @returns Created audit log entry
 */
export async function logAudit(entry) {
    const db = getPool();
    const query = `
    INSERT INTO audit_logs (
      action, resource, resource_id, organization_id, user_id,
      ip_address, user_agent, success, error_message, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
    const values = [
        entry.action,
        entry.resource,
        entry.resourceId,
        entry.organizationId,
        entry.userId,
        entry.ipAddress,
        entry.userAgent,
        entry.success,
        entry.errorMessage,
        entry.metadata ? JSON.stringify(entry.metadata) : null
    ];
    const result = await db.query(query, values);
    const row = result.rows[0];
    return {
        id: row.id,
        createdAt: row.created_at.toISOString(),
        action: row.action,
        resource: row.resource,
        resourceId: row.resource_id,
        organizationId: row.organization_id,
        userId: row.user_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        success: row.success,
        errorMessage: row.error_message,
        metadata: row.metadata
    };
}
//# sourceMappingURL=audit-log.repository.js.map