/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { llmCall } from '@flusk/business-logic';
import { RedisClient } from '@flusk/resources';

const { hashPrompt, calculateCost } = llmCall;

interface LlmCallBody {
  provider: string;
  model: string;
  prompt: string;
  tokens: { input: number; output: number; total: number };
  response: string;
}

interface LlmCallData {
  provider: string;
  model: string;
  prompt: string;
  promptHash: string;
  tokens: { input: number; output: number; total: number };
  cost: number;
  response: string;
  cached: boolean;
  organizationId: string;
  consentGiven: boolean;
  consentPurpose: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    promptHash?: string;
    llmCallData?: LlmCallData;
  }
}

/**
 * Hash prompt and attach to request for deduplication
 */
export async function hashPromptHook(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const body = request.body as { prompt: string; model: string };
  const { promptHash } = hashPrompt({
    promptText: body.prompt,
    modelName: body.model,
  });
  request.promptHash = promptHash;
}

/**
 * Check Redis cache for existing response
 */
export async function checkCacheHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const hash = request.promptHash;
  if (!hash) return;

  try {
    const cached = await RedisClient.getCachedResponse(hash);
    if (cached) {
      return reply.code(200).send({
        cached: true,
        response: cached,
        promptHash: hash,
      });
    }
  } catch {
    // Cache miss or error — continue to handler
  }
}

/**
 * Calculate cost and build llmCallData on request
 */
export async function calculateCostHook(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const body = request.body as LlmCallBody;
  const hash = request.promptHash ?? '';

  const { costUsd } = calculateCost({
    providerName: body.provider,
    modelName: body.model,
    tokenUsage: body.tokens,
  });

  request.llmCallData = {
    provider: body.provider,
    model: body.model,
    prompt: body.prompt,
    promptHash: hash,
    tokens: body.tokens,
    cost: costUsd,
    response: body.response,
    cached: false,
    organizationId: request.organizationId || 'default',
    consentGiven: true,
    consentPurpose: 'optimization',
  };
}

/**
 * Cache the response in Redis after sending
 */
export async function cacheResponseHook(
  request: FastifyRequest,
  _reply: FastifyReply,
  payload: string
): Promise<string> {
  const hash = request.promptHash;
  const body = request.body as { response?: string };
  if (hash && body?.response) {
    RedisClient.cacheResponse(hash, body.response).catch(() => {});
  }
  return payload;
}
