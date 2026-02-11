/**
 * Vercel Serverless Adapter for Flusk Platform
 *
 * Exports Fastify app as Vercel serverless function.
 * Optimized for cold starts and connection reuse.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { FastifyInstance } from 'fastify';
import { createApp } from './app.js';

/**
 * Global Fastify instance (reused across warm invocations)
 */
let cachedApp: FastifyInstance | null = null;

/**
 * Initialize Fastify app with serverless-optimized settings
 */
async function getApp(): Promise<FastifyInstance> {
  // Reuse existing instance if available (warm start)
  if (cachedApp) {
    return cachedApp;
  }

  // Create new instance (cold start)
  const app = await createApp({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      // Structured logging for Vercel
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          headers: req.headers,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
    },
    requireAuth: process.env.REQUIRE_AUTH === 'true',
    cors: {
      origin: process.env.CORS_ORIGIN || true,
      credentials: true,
    },
  });

  // Cache for subsequent invocations
  cachedApp = app;

  return app;
}

/**
 * Vercel serverless handler
 *
 * Converts Vercel request/response to Fastify format.
 * Handles both warm and cold starts efficiently.
 */
// eslint-disable-next-line no-restricted-syntax -- Vercel requires default export
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const app = await getApp();

  // Convert Vercel request to Node.js IncomingMessage format
  const fastifyRequest = {
    method: req.method || 'GET',
    url: req.url || '/',
    headers: req.headers,
    body: req.body,
    // Preserve original request for Fastify
    raw: req,
  };

  try {
    // Inject request into Fastify
    await app.ready();

    // Use Fastify's inject for testing-like request handling
    const response = await app.inject({
      method: fastifyRequest.method,
      url: fastifyRequest.url,
      headers: fastifyRequest.headers as Record<string, string>,
      payload: fastifyRequest.body,
    });

    // Set response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value !== undefined) {
        res.setHeader(key, value);
      }
    });

    // Send response
    res.status(response.statusCode).send(response.body);
  } catch (error) {
    // Log error and return 500
    console.error('Vercel adapter error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
