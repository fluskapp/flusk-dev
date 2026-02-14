import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { routing } from '@flusk/business-logic';
import {
  RoutingRuleRepository,
  ModelPerformanceRepository,
  RoutingDecisionRepository,
} from '@flusk/resources';

const BodySchema = Type.Object({
  ruleId: Type.String({ format: 'uuid' }),
  prompt: Type.String(),
  tokenCount: Type.Integer({ minimum: 1 }),
  originalModel: Type.String(),
});

export function registerRoutePrompt(fastify: FastifyInstance): void {
  fastify.post('/', { schema: { body: BodySchema } }, async (request, reply) => {
    const pool = fastify.pg.pool;
    const body = request.body as {
      ruleId: string; prompt: string; tokenCount: number; originalModel: string;
    };

    const rule = await RoutingRuleRepository.findById(pool, body.ruleId);
    if (!rule) return reply.status(404).send({ error: 'Rule not found' });
    if (!rule.enabled) return reply.status(400).send({ error: 'Rule is disabled' });

    const complexity = routing.classifyComplexity({
      prompt: body.prompt,
      tokenCount: body.tokenCount,
    });

    const perfData = await ModelPerformanceRepository.findByCategory(pool, complexity.level);

    const selection = routing.selectModel({
      complexity: complexity.level,
      qualityThreshold: rule.qualityThreshold,
      fallbackModel: rule.fallbackModel,
      modelPerformance: perfData,
    });

    await RoutingDecisionRepository.create(pool, {
      ruleId: rule.id,
      selectedModel: selection.selectedModel,
      originalModel: body.originalModel,
      reason: selection.reason,
      costSaved: 0,
    });

    return {
      selectedModel: selection.selectedModel,
      reason: selection.reason,
      complexity: complexity.level,
      expectedQuality: selection.expectedQuality,
    };
  });
}
