import type { FastifyRequest } from 'fastify';
import { logAudit } from '@flusk/resources';
import { ExportParams } from './types.js';

/**
 * Export all data for an organization (GDPR Right to Data Portability)
 * GET /gdpr/user/:orgId/data
 */
export async function exportUserData(
  request: FastifyRequest<{ Params: ExportParams }>,
  reply: any
) {
  const { orgId } = request.params;
  const db = request.server.pg.pool;

  try {
    const [llmCalls, patterns, conversions] = await Promise.all([
      db.query('SELECT * FROM llm_calls WHERE organization_id = $1', [orgId]),
      db.query('SELECT * FROM patterns WHERE organization_id = $1', [orgId]),
      db.query('SELECT * FROM conversions WHERE organization_id = $1', [orgId])
    ]);

    const exportData = {
      organizationId: orgId,
      exportedAt: new Date().toISOString(),
      data: {
        llmCalls: llmCalls.rows,
        patterns: patterns.rows,
        conversions: conversions.rows
      },
      metadata: {
        totalLlmCalls: llmCalls.rowCount,
        totalPatterns: patterns.rowCount,
        totalConversions: conversions.rowCount
      }
    };

    await logAudit({
      action: 'export',
      resource: 'organization_data',
      resourceId: null,
      organizationId: orgId,
      userId: null,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || null,
      success: true,
      errorMessage: null,
      metadata: exportData.metadata
    });

    return reply.send(exportData);
  } catch (error: any) {
    await logAudit({
      action: 'export',
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
