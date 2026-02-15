import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Example preHandler hook for Upattern
 * Add business logic hooks here
 */
export async function validateUpatternHook(
  _request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  // TODO: Add validation logic
  // Example:
  // const body = request.body as Record<string, unknown>;
  // if (!body.requiredField) {
  //   return reply.code(400).send({ error: 'requiredField is required' });
  // }
}

/**
 * Example onSend hook for Upattern
 * Add post-processing logic here
 */
export async function transformUpatternHook(
  _request: FastifyRequest,
  _reply: FastifyReply,
  payload: unknown
): Promise<unknown> {
  // TODO: Add transformation logic
  return payload;
}
