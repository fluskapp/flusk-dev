import { registerListPatterns } from './list-patterns.js';
import { registerGetPattern } from './get-pattern.js';
import { registerGetByOrganization } from './get-by-organization.js';
/**
 * Register pattern routes
 * Implements REST endpoints for pattern detection and analysis
 */
export async function patternRoutes(fastify) {
    registerListPatterns(fastify);
    registerGetPattern(fastify);
    registerGetByOrganization(fastify);
}
//# sourceMappingURL=index.js.map