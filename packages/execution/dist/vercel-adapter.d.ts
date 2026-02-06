/**
 * Vercel Serverless Adapter for Flusk Platform
 *
 * Exports Fastify app as Vercel serverless function.
 * Optimized for cold starts and connection reuse.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
/**
 * Vercel serverless handler
 *
 * Converts Vercel request/response to Fastify format.
 * Handles both warm and cold starts efficiently.
 */
export default function handler(req: VercelRequest, res: VercelResponse): Promise<void>;
//# sourceMappingURL=vercel-adapter.d.ts.map