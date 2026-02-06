import type { FastifyRequest } from 'fastify';
import { ExportParams } from './types.js';
/**
 * Export all data for an organization (GDPR Right to Data Portability)
 * GET /gdpr/user/:orgId/data
 */
export declare function exportUserData(request: FastifyRequest<{
    Params: ExportParams;
}>, reply: any): Promise<any>;
//# sourceMappingURL=export-user-data.d.ts.map