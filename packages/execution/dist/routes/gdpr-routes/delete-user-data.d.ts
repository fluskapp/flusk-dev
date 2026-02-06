import type { FastifyRequest } from 'fastify';
import { DeleteParams } from './types.js';
/**
 * Hard delete all data for an organization (GDPR Right to Deletion)
 * DELETE /gdpr/user/:orgId
 */
export declare function deleteUserData(request: FastifyRequest<{
    Params: DeleteParams;
}>, reply: any): Promise<any>;
//# sourceMappingURL=delete-user-data.d.ts.map