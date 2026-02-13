// Database pool (deprecated — use @fastify/postgres instead)
export { getPool, closePool } from './db/pool.js';

// Repository exports
export * as LLMCallRepository from './repositories/llm-call.repository.js';
export * as PatternRepository from './repositories/pattern/index.js';
export * as ConversionRepository from './repositories/conversion/index.js';

// Routing repository exports
export * as RoutingRuleRepository from './repositories/routing-rule/index.js';
export * as ModelPerformanceRepository from './repositories/model-performance/index.js';
export * as RoutingDecisionRepository from './repositories/routing-decision/index.js';

export * as ProfileSessionRepository from './repositories/profile-session/index.js';

// Cache exports
export * as RedisClient from './cache/redis.client.js';

// Client exports
export * as PricingClient from './clients/pricing.client.js';
export * as EmbeddingClient from './clients/embedding.client.js';
export * as OpenAIEmbeddingClient from './clients/openai-embedding.client.js';
export * as EventBusClient from './clients/event-bus.client.js';

// Encryption exports (GDPR)
export * from './encryption/encrypt.js';
export * from './encryption/decrypt.js';

// Audit exports (SOC2)
export * from './audit/audit-log.repository.js';

export * as TraceRepository from './repositories/trace.repository.js';
export * as SpanRepository from './repositories/span.repository.js';
export * as OptimizationRepository from './repositories/optimization.repository.js';
export * as PromptTemplateRepository from './repositories/prompt-template.repository.js';
export * as PromptVersionRepository from './repositories/prompt-version.repository.js';
