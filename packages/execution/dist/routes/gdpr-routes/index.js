import { deleteUserData } from './delete-user-data.js';
import { exportUserData } from './export-user-data.js';
/**
 * GDPR compliance routes
 * - Right to deletion (hard delete all org data)
 * - Right to data portability (export all org data)
 */
export default async function gdprRoutes(fastify) {
    fastify.delete('/gdpr/user/:orgId', deleteUserData);
    fastify.get('/gdpr/user/:orgId/data', exportUserData);
}
//# sourceMappingURL=index.js.map