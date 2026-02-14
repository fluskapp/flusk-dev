/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyInstance } from 'fastify';
import { logAudit } from '@flusk/resources';

/**
 * Audit Logging Plugin
 * Logs all API requests for SOC2 compliance
 *
 * Logs:
 * - HTTP method and path
 * - Organization ID (from auth)
 * - IP address and user agent
 * - Request outcome (success/error)
 */
export async function auditPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onResponse', async (request, reply) => {
    const statusCode = reply.statusCode;
    const success = statusCode >= 200 && statusCode < 400;

    try {
      await logAudit({
        action: request.method,
        resource: request.url,
        resourceId: null,
        organizationId: request.organizationId || 'anonymous',
        userId: null,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
        success,
        errorMessage: success ? null : `HTTP ${statusCode}`,
        metadata: {
          method: request.method,
          path: request.url,
          statusCode
        }
      });
    } catch (err) {
      request.log.error({ err }, 'Audit logging failed');
    }
  });
}
