/**
 * Global error handler for Fastify
 * Attaches to setErrorHandler hook
 */
export async function errorHandler(error, request, reply) {
    // Log error for debugging
    request.log.error({
        err: error,
        url: request.url,
        method: request.method,
        requestId: request.id
    }, 'Request error');
    // Determine status code
    const statusCode = error.statusCode || 500;
    // Map error code for client
    const errorCode = mapErrorCode(error);
    // Build structured error response
    const response = {
        error: {
            message: error.message || 'Internal Server Error',
            code: errorCode,
            statusCode,
            // Include validation details if present
            ...(error.validation && { details: error.validation })
        }
    };
    // Send response
    await reply.status(statusCode).send(response);
}
/**
 * Map error to a client-friendly error code
 */
function mapErrorCode(error) {
    // Fastify validation errors
    if (error.validation) {
        return 'VALIDATION_ERROR';
    }
    // HTTP status-based codes
    if (error.statusCode === 404) {
        return 'NOT_FOUND';
    }
    if (error.statusCode === 401) {
        return 'UNAUTHORIZED';
    }
    if (error.statusCode === 403) {
        return 'FORBIDDEN';
    }
    if (error.statusCode === 409) {
        return 'CONFLICT';
    }
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        return 'BAD_REQUEST';
    }
    // Default to internal server error
    return 'INTERNAL_SERVER_ERROR';
}
//# sourceMappingURL=error-handler.middleware.js.map