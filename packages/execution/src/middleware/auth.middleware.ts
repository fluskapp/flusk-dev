/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getLogger } from '@flusk/logger';

const log = getLogger().child({ module: 'auth-middleware' });

declare module 'fastify' {
  interface FastifyRequest {
    organizationId: string;
  }
}

/** Hash a token for constant-time comparison */
function hashToken(token: string): Buffer {
  return createHmac('sha256', 'flusk').update(token).digest();
}

/** Validate API key against configured FLUSK_API_KEY */
function isValidApiKey(token: string): boolean {
  const expected = process.env.FLUSK_API_KEY;
  if (!expected) {
    log.warn('FLUSK_API_KEY not configured — rejecting all requests');
    return false;
  }
  const a = hashToken(token);
  const b = hashToken(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sendUnauthorized(reply: FastifyReply, message: string): FastifyReply {
  return reply.status(401).send({
    error: { message, code: 'UNAUTHORIZED', statusCode: 401 },
  });
}

function parseToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

function extractOrgId(token: string): string | null {
  const idx = token.lastIndexOf('_');
  return idx > 0 ? token.substring(0, idx) : null;
}

/** Authentication hook — validates API key and extracts org ID */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = parseToken(request.headers.authorization);
  if (!token) return sendUnauthorized(reply, 'Missing or invalid Authorization header');

  if (!isValidApiKey(token)) {
    log.warn({ ip: request.ip }, 'Invalid API key attempt');
    return sendUnauthorized(reply, 'Invalid API key');
  }

  const organizationId = extractOrgId(token);
  if (!organizationId) return sendUnauthorized(reply, 'Invalid API key format');

  request.organizationId = organizationId;
}

/** Validate x-flusk-api-key header for OTLP ingestion */
export async function otlpAuthHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const key = request.headers['x-flusk-api-key'] as string | undefined;
  if (!key || !isValidApiKey(key)) {
    log.warn({ ip: request.ip }, 'OTLP request with invalid API key');
    return sendUnauthorized(reply, 'Missing or invalid x-flusk-api-key');
  }

  const orgId = extractOrgId(key);
  if (orgId) request.organizationId = orgId;
}
