import { logAudit } from '@flusk/resources';
import { getPool } from './pool.js';
/**
 * Hard delete all data for an organization (GDPR Right to Deletion)
 * DELETE /gdpr/user/:orgId
 */
export async function deleteUserData(request, reply) {
    const { orgId } = request.params;
    const db = getPool();
    try {
        // Start transaction
        await db.query('BEGIN');
        // Delete all data (cascade deletes handled by foreign keys)
        const llmCallsResult = await db.query('DELETE FROM llm_calls WHERE organization_id = $1', [orgId]);
        const patternsResult = await db.query('DELETE FROM patterns WHERE organization_id = $1', [orgId]);
        const conversionsResult = await db.query('DELETE FROM conversions WHERE organization_id = $1', [orgId]);
        await db.query('COMMIT');
        // Log audit event
        await logAudit({
            action: 'delete_all',
            resource: 'organization_data',
            resourceId: null,
            organizationId: orgId,
            userId: null,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] || null,
            success: true,
            errorMessage: null,
            metadata: {
                llmCallsDeleted: llmCallsResult.rowCount,
                patternsDeleted: patternsResult.rowCount,
                conversionsDeleted: conversionsResult.rowCount
            }
        });
        return reply.send({
            deleted: {
                llmCalls: llmCallsResult.rowCount,
                patterns: patternsResult.rowCount,
                conversions: conversionsResult.rowCount
            }
        });
    }
    catch (error) {
        await db.query('ROLLBACK');
        await logAudit({
            action: 'delete_all',
            resource: 'organization_data',
            resourceId: null,
            organizationId: orgId,
            userId: null,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'] || null,
            success: false,
            errorMessage: error.message,
            metadata: null
        });
        return reply.status(500).send({ error: error.message });
    }
}
//# sourceMappingURL=delete-user-data.js.map