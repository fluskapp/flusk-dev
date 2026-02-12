import type { FastifyRequest } from 'fastify';
import { logAudit } from '@flusk/resources';
import { DeleteParams } from './types.js';

/**
 * Hard delete all data for an organization (GDPR Right to Deletion)
 * DELETE /gdpr/user/:orgId
 */
export async function deleteUserData(
  request: FastifyRequest<{ Params: DeleteParams }>,
  reply: any
) {
  const { orgId } = request.params;
  const db = request.server.pg.pool;

  try {
    await db.query('BEGIN');

    const llmCallsResult = await db.query(
      'DELETE FROM llm_calls WHERE organization_id = $1', [orgId]
    );
    const patternsResult = await db.query(
      'DELETE FROM patterns WHERE organization_id = $1', [orgId]
    );
    const conversionsResult = await db.query(
      'DELETE FROM conversions WHERE organization_id = $1', [orgId]
    );

    await db.query('COMMIT');

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
  } catch (error: any) {
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
