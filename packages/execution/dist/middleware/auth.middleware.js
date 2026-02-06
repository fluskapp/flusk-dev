/**
 * Authentication hook
 * Validates Authorization header and extracts organization ID
 */
export async function authMiddleware(request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        return reply.status(401).send({
            error: {
                message: 'Missing Authorization header',
                code: 'UNAUTHORIZED',
                statusCode: 401
            }
        });
    }
    // Expected format: "Bearer orgId_secretKey"
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return reply.status(401).send({
            error: {
                message: 'Invalid Authorization header format. Expected: Bearer <api_key>',
                code: 'UNAUTHORIZED',
                statusCode: 401
            }
        });
    }
    // Parse API key format: orgId_secretKey
    const parts = token.split('_');
    if (parts.length < 2) {
        return reply.status(401).send({
            error: {
                message: 'Invalid API key format. Expected: orgId_secretKey',
                code: 'UNAUTHORIZED',
                statusCode: 401
            }
        });
    }
    // Extract organization ID (everything before the last underscore)
    // This allows org IDs to contain underscores
    const lastUnderscoreIndex = token.lastIndexOf('_');
    const organizationId = token.substring(0, lastUnderscoreIndex);
    if (!organizationId) {
        return reply.status(401).send({
            error: {
                message: 'Invalid API key: missing organization ID',
                code: 'UNAUTHORIZED',
                statusCode: 401
            }
        });
    }
    // TODO: Validate API key against database
    // For now, just extract and decorate the request
    // Decorate request with organizationId
    request.organizationId = organizationId;
}
/**
 * Optional authentication hook
 * Validates API key if present, but allows requests without it
 */
export async function optionalAuthMiddleware(request, _reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        // No auth header, skip validation
        return;
    }
    const [scheme, token] = authHeader.split(' ');
    if (scheme === 'Bearer' && token) {
        const lastUnderscoreIndex = token.lastIndexOf('_');
        if (lastUnderscoreIndex > 0) {
            const organizationId = token.substring(0, lastUnderscoreIndex);
            if (organizationId) {
                request.organizationId = organizationId;
            }
        }
    }
}
//# sourceMappingURL=auth.middleware.js.map