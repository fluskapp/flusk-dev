# Flusk Platform — Technical Architecture v3

---

## 1. Refined Folder Structure

```
flusk/
├── watt.json
├── flusk.config.ts
├── package.json
├── .env.example
├── docker-compose.yml
│
├── packages/
│   │
│   ├── entities/                      # 📌 SOURCE OF TRUTH
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── base.entity.ts
│   │   │   ├── llm-call.entity.ts
│   │   │   ├── pattern.entity.ts
│   │   │   ├── conversion.entity.ts
│   │   │   ├── organization.entity.ts
│   │   │   ├── api-key.entity.ts
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   │
│   ├── types/                         # ⚡ TypeScript types + JSON Schema
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── llm-call.types.ts
│   │   │   ├── llm-call.schema.json
│   │   │   ├── pattern.types.ts
│   │   │   ├── pattern.schema.json
│   │   │   ├── common.types.ts        # Shared types (pagination, errors)
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   │
│   ├── resources/                     # ⚡ Data Access Layer (DB, APIs, Clients)
│   │   ├── package.json
│   │   ├── src/
│   │   │   │
│   │   │   ├── db/                    # Database
│   │   │   │   ├── client.ts          # PostgreSQL connection
│   │   │   │   ├── redis.ts           # Redis connection
│   │   │   │   └── migrations.ts      # Migration runner
│   │   │   │
│   │   │   ├── repositories/          # Entity repositories
│   │   │   │   ├── llm-call.repository.ts
│   │   │   │   ├── pattern.repository.ts
│   │   │   │   ├── conversion.repository.ts
│   │   │   │   ├── organization.repository.ts
│   │   │   │   └── api-key.repository.ts
│   │   │   │
│   │   │   ├── clients/               # External service clients
│   │   │   │   ├── embedding.client.ts    # ML service client
│   │   │   │   ├── pricing.client.ts      # Pricing API client
│   │   │   │   └── event-bus.client.ts    # Redis Streams client
│   │   │   │
│   │   │   ├── migrations/            # SQL migration files
│   │   │   │   ├── 001_llm-calls.sql
│   │   │   │   ├── 002_patterns.sql
│   │   │   │   └── 003_conversions.sql
│   │   │   │
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   │
│   ├── business-logic/                # ⚡ Pure Functions (no side effects)
│   │   ├── package.json
│   │   ├── src/
│   │   │   │
│   │   │   ├── llm-call/              # LLM Call domain functions
│   │   │   │   ├── hash-prompt.function.ts
│   │   │   │   ├── calculate-cost.function.ts
│   │   │   │   ├── validate-tokens.function.ts
│   │   │   │   ├── normalize-provider.function.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── pattern/               # Pattern domain functions
│   │   │   │   ├── detect-duplicates.function.ts
│   │   │   │   ├── calculate-savings.function.ts
│   │   │   │   ├── score-pattern.function.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── conversion/            # Conversion domain functions
│   │   │   │   ├── generate-cache-rule.function.ts
│   │   │   │   ├── generate-downgrade.function.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── shared/                # Shared utility functions
│   │   │   │   ├── hash.function.ts
│   │   │   │   ├── validate-uuid.function.ts
│   │   │   │   ├── sanitize-pii.function.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   │
│   ├── execution/                     # ⚡ HTTP Layer (Routes, Plugins, Middleware)
│   │   ├── package.json
│   │   ├── src/
│   │   │   │
│   │   │   ├── routes/                # Route handlers
│   │   │   │   ├── llm-call.routes.ts
│   │   │   │   ├── pattern.routes.ts
│   │   │   │   ├── conversion.routes.ts
│   │   │   │   └── health.routes.ts
│   │   │   │
│   │   │   ├── plugins/               # Fastify plugins (compose routes + middleware)
│   │   │   │   ├── llm-call.plugin.ts
│   │   │   │   ├── pattern.plugin.ts
│   │   │   │   ├── conversion.plugin.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── middleware/            # Shared middleware
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── rate-limit.middleware.ts
│   │   │   │   ├── error-handler.middleware.ts
│   │   │   │   └── request-logger.middleware.ts
│   │   │   │
│   │   │   ├── hooks/                 # Request lifecycle hooks
│   │   │   │   ├── llm-call.hooks.ts  # Composes functions + resources
│   │   │   │   ├── pattern.hooks.ts
│   │   │   │   └── conversion.hooks.ts
│   │   │   │
│   │   │   ├── app.ts                 # Fastify app factory
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   │
│   ├── sdk/                           # Customer SDKs
│   │   ├── node/
│   │   │   ├── package.json
│   │   │   └── src/
│   │   └── python/
│   │       ├── pyproject.toml
│   │       └── src/flusk/
│   │
│   └── cli/                           # Flusk CLI
│       ├── package.json
│       ├── bin/
│       │   └── flusk.ts
│       └── src/
│           ├── commands/
│           │   ├── generate.ts
│           │   ├── migrate.ts
│           │   └── dev.ts
│           └── generators/
│               ├── types.generator.ts
│               ├── resources.generator.ts
│               ├── business-logic.generator.ts
│               └── execution.generator.ts
│
├── web/                               # Platformatic Watt services
│   ├── api/
│   │   ├── platformatic.json
│   │   └── index.ts
│   ├── ml/
│   │   ├── platformatic.json
│   │   └── main.py
│   └── worker/
│       ├── platformatic.json
│       └── jobs/
│
└── docs/
```

---

## 2. Package Responsibilities (Refined)

| Package | What It Contains | Side Effects? |
|---------|------------------|---------------|
| `entities` | Schema definitions, column configs, route configs | ❌ None |
| `types` | TypeScript interfaces, JSON Schemas | ❌ None |
| `resources` | DB repositories, API clients, external service connections | ✅ Yes (I/O) |
| `business-logic` | Pure functions — validation, transformation, calculation | ❌ None |
| `execution` | Routes, plugins, middleware, hooks (composes resources + functions) | ✅ Yes (HTTP) |

**Key Principle**: `business-logic` functions are **pure** — they take input, return output, no database calls, no API calls, no side effects. All I/O happens in `resources`. The `execution` layer composes them together.

---

## 3. Business Logic — Pure Functions

### 3.1 Function File Structure

Each function is a single file, exported as a named function:

```typescript
// packages/business-logic/src/llm-call/hash-prompt.function.ts

import { createHash } from 'node:crypto'

export interface HashPromptInput {
  promptText: string
}

export interface HashPromptOutput {
  promptHash: string
}

/**
 * Generate SHA-256 hash of prompt text
 * Used for exact duplicate detection
 */
export function hashPrompt(input: HashPromptInput): HashPromptOutput {
  const promptHash = createHash('sha256')
    .update(input.promptText)
    .digest('hex')
  
  return { promptHash }
}
```

```typescript
// packages/business-logic/src/llm-call/calculate-cost.function.ts

export interface CalculateCostInput {
  tokensInput: number
  tokensOutput: number
  tokensCached?: number
  pricing: {
    inputPerMillion: number
    outputPerMillion: number
    cachedPerMillion?: number
  }
}

export interface CalculateCostOutput {
  costUsd: number
  breakdown: {
    inputCost: number
    outputCost: number
    cachedCost: number
  }
}

/**
 * Calculate cost in USD for an LLM call
 * Pure calculation — no external calls
 */
export function calculateCost(input: CalculateCostInput): CalculateCostOutput {
  const { tokensInput, tokensOutput, tokensCached = 0, pricing } = input
  
  const inputCost = (tokensInput * pricing.inputPerMillion) / 1_000_000
  const outputCost = (tokensOutput * pricing.outputPerMillion) / 1_000_000
  const cachedCost = (tokensCached * (pricing.cachedPerMillion ?? 0)) / 1_000_000
  
  return {
    costUsd: inputCost + outputCost + cachedCost,
    breakdown: { inputCost, outputCost, cachedCost },
  }
}
```

```typescript
// packages/business-logic/src/llm-call/validate-tokens.function.ts

export interface ValidateTokensInput {
  tokensInput: number
  tokensOutput: number
  tokensCached?: number
}

export interface ValidateTokensOutput {
  isValid: boolean
  errors: string[]
}

/**
 * Validate token counts are within acceptable ranges
 */
export function validateTokens(input: ValidateTokensInput): ValidateTokensOutput {
  const errors: string[] = []
  
  if (input.tokensInput < 0) {
    errors.push('tokensInput must be non-negative')
  }
  if (input.tokensOutput < 0) {
    errors.push('tokensOutput must be non-negative')
  }
  if (input.tokensInput > 1_000_000) {
    errors.push('tokensInput exceeds maximum (1M)')
  }
  if (input.tokensOutput > 1_000_000) {
    errors.push('tokensOutput exceeds maximum (1M)')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}
```

```typescript
// packages/business-logic/src/llm-call/normalize-provider.function.ts

export type ProviderInput = string
export type ProviderOutput = 'openai' | 'anthropic' | 'azure' | 'google' | 'custom'

const PROVIDER_ALIASES: Record<string, ProviderOutput> = {
  'openai': 'openai',
  'gpt': 'openai',
  'chatgpt': 'openai',
  'anthropic': 'anthropic',
  'claude': 'anthropic',
  'azure': 'azure',
  'azure-openai': 'azure',
  'google': 'google',
  'gemini': 'google',
  'vertex': 'google',
}

/**
 * Normalize provider name to canonical form
 */
export function normalizeProvider(input: ProviderInput): ProviderOutput {
  const normalized = input.toLowerCase().trim()
  return PROVIDER_ALIASES[normalized] ?? 'custom'
}
```

### 3.2 Barrel Export

```typescript
// packages/business-logic/src/llm-call/index.ts

export * from './hash-prompt.function'
export * from './calculate-cost.function'
export * from './validate-tokens.function'
export * from './normalize-provider.function'
```

```typescript
// packages/business-logic/src/index.ts

export * as llmCall from './llm-call'
export * as pattern from './pattern'
export * as conversion from './conversion'
export * as shared from './shared'
```

### 3.3 Usage Pattern

```typescript
// In execution layer — compose functions with resources
import { hashPrompt, calculateCost, validateTokens } from '@flusk/business-logic/llm-call'
import { pricingClient } from '@flusk/resources/clients'

// Pure function — no I/O
const { promptHash } = hashPrompt({ promptText: input.promptText })

// Resource call — I/O
const pricing = await pricingClient.getModelPricing(input.provider, input.model)

// Pure function — no I/O
const { costUsd } = calculateCost({
  tokensInput: input.tokensInput,
  tokensOutput: input.tokensOutput,
  pricing,
})
```

---

## 4. Resources — Data Access Only

### 4.1 Repository Pattern

```typescript
// packages/resources/src/repositories/llm-call.repository.ts

import { sql, DatabasePool } from '../db/client'
import type { LLMCall, LLMCallCreate, LLMCallFilters } from '@flusk/types'

export class LLMCallRepository {
  constructor(private db: DatabasePool) {}
  
  async findById(id: string): Promise<LLMCall | null> {
    const [row] = await this.db.query<LLMCall>`
      SELECT * FROM llm_calls
      WHERE id = ${id} AND deleted_at IS NULL
    `
    return row ?? null
  }
  
  async findMany(
    filters: LLMCallFilters,
    pagination: { limit: number; offset: number }
  ): Promise<{ data: LLMCall[]; total: number }> {
    const where = this.buildWhere(filters)
    
    const [{ count }] = await this.db.query`
      SELECT COUNT(*)::int as count FROM llm_calls
      WHERE deleted_at IS NULL ${where}
    `
    
    const data = await this.db.query<LLMCall>`
      SELECT * FROM llm_calls
      WHERE deleted_at IS NULL ${where}
      ORDER BY created_at DESC
      LIMIT ${pagination.limit} OFFSET ${pagination.offset}
    `
    
    return { data, total: count }
  }
  
  async create(input: LLMCallCreate): Promise<LLMCall> {
    const [row] = await this.db.query<LLMCall>`
      INSERT INTO llm_calls ${this.db.insert(input)}
      RETURNING *
    `
    return row
  }
  
  async createBatch(inputs: LLMCallCreate[]): Promise<LLMCall[]> {
    if (inputs.length === 0) return []
    
    return await this.db.query<LLMCall>`
      INSERT INTO llm_calls ${this.db.insertMany(inputs)}
      RETURNING *
    `
  }
  
  async softDelete(id: string): Promise<boolean> {
    const result = await this.db.query`
      UPDATE llm_calls
      SET deleted_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
    `
    return result.rowCount > 0
  }
  
  async findSimilarByEmbedding(
    embedding: number[],
    limit: number = 10,
    threshold: number = 0.85
  ): Promise<Array<LLMCall & { similarity: number }>> {
    return await this.db.query`
      SELECT *, 1 - (embedding <=> ${embedding}::vector) as similarity
      FROM llm_calls
      WHERE embedding IS NOT NULL
        AND deleted_at IS NULL
        AND 1 - (embedding <=> ${embedding}::vector) >= ${threshold}
      ORDER BY embedding <=> ${embedding}::vector
      LIMIT ${limit}
    `
  }
  
  async findByPromptHash(hash: string): Promise<LLMCall[]> {
    return await this.db.query<LLMCall>`
      SELECT * FROM llm_calls
      WHERE prompt_hash = ${hash} AND deleted_at IS NULL
      ORDER BY created_at DESC
    `
  }
  
  private buildWhere(filters: LLMCallFilters) {
    const conditions: string[] = []
    
    if (filters.provider) {
      conditions.push(`provider = ${filters.provider}`)
    }
    if (filters.model) {
      conditions.push(`model = ${filters.model}`)
    }
    if (filters.organizationId) {
      conditions.push(`organization_id = ${filters.organizationId}`)
    }
    if (filters.createdAfter) {
      conditions.push(`created_at >= ${filters.createdAfter}`)
    }
    if (filters.createdBefore) {
      conditions.push(`created_at <= ${filters.createdBefore}`)
    }
    
    return conditions.length > 0 
      ? sql`AND ${sql.join(conditions, sql` AND `)}`
      : sql``
  }
}
```

### 4.2 External Clients

```typescript
// packages/resources/src/clients/pricing.client.ts

export interface ModelPricing {
  provider: string
  model: string
  inputPerMillion: number
  outputPerMillion: number
  cachedPerMillion?: number
}

// Static pricing data (could be fetched from API in future)
const PRICING_TABLE: Record<string, ModelPricing> = {
  'openai:gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    inputPerMillion: 2.50,
    outputPerMillion: 10.00,
    cachedPerMillion: 1.25,
  },
  'openai:gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputPerMillion: 0.15,
    outputPerMillion: 0.60,
    cachedPerMillion: 0.075,
  },
  'anthropic:claude-3-5-sonnet': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet',
    inputPerMillion: 3.00,
    outputPerMillion: 15.00,
    cachedPerMillion: 0.30,
  },
  // ... more models
}

export class PricingClient {
  async getModelPricing(provider: string, model: string): Promise<ModelPricing> {
    const key = `${provider}:${model}`
    const pricing = PRICING_TABLE[key]
    
    if (!pricing) {
      // Default fallback for unknown models
      return {
        provider,
        model,
        inputPerMillion: 1.00,
        outputPerMillion: 3.00,
      }
    }
    
    return pricing
  }
  
  async listAllPricing(): Promise<ModelPricing[]> {
    return Object.values(PRICING_TABLE)
  }
}

export const pricingClient = new PricingClient()
```

```typescript
// packages/resources/src/clients/embedding.client.ts

export interface EmbeddingRequest {
  text: string
  model?: string
}

export interface EmbeddingResponse {
  embedding: number[]
  model: string
  dimensions: number
}

export class EmbeddingClient {
  private baseUrl: string
  
  constructor(baseUrl: string = 'http://ml.plt.local') {
    this.baseUrl = baseUrl
  }
  
  async generate(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    
    if (!response.ok) {
      throw new Error(`Embedding service error: ${response.status}`)
    }
    
    return await response.json()
  }
  
  async generateBatch(requests: EmbeddingRequest[]): Promise<EmbeddingResponse[]> {
    const response = await fetch(`${this.baseUrl}/embeddings/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: requests }),
    })
    
    if (!response.ok) {
      throw new Error(`Embedding service error: ${response.status}`)
    }
    
    const result = await response.json()
    return result.items
  }
}

export const embeddingClient = new EmbeddingClient()
```

```typescript
// packages/resources/src/clients/event-bus.client.ts

import { redis } from '../db/redis'

export interface Event<T = unknown> {
  type: string
  data: T
  timestamp: string
  id?: string
}

export class EventBusClient {
  async publish<T>(stream: string, event: Event<T>): Promise<string> {
    const id = await redis.xadd(
      stream,
      '*',
      'type', event.type,
      'data', JSON.stringify(event.data),
      'timestamp', event.timestamp,
    )
    return id
  }
  
  async subscribe(
    stream: string,
    group: string,
    consumer: string,
    handler: (event: Event) => Promise<void>
  ): Promise<void> {
    // Create consumer group if not exists
    try {
      await redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM')
    } catch (err: any) {
      if (!err.message.includes('BUSYGROUP')) throw err
    }
    
    // Read and process events
    while (true) {
      const results = await redis.xreadgroup(
        'GROUP', group, consumer,
        'BLOCK', 5000,
        'COUNT', 10,
        'STREAMS', stream, '>'
      )
      
      if (!results) continue
      
      for (const [, messages] of results) {
        for (const [id, fields] of messages) {
          const event: Event = {
            id,
            type: fields[1],
            data: JSON.parse(fields[3]),
            timestamp: fields[5],
          }
          
          await handler(event)
          await redis.xack(stream, group, id)
        }
      }
    }
  }
}

export const eventBusClient = new EventBusClient()
```

---

## 5. Execution — Composition Layer

### 5.1 Hooks (Compose Functions + Resources)

```typescript
// packages/execution/src/hooks/llm-call.hooks.ts

import type { LLMCallCreate, LLMCall } from '@flusk/types'
import { hashPrompt, calculateCost, validateTokens, normalizeProvider } from '@flusk/business-logic/llm-call'
import { pricingClient, embeddingClient, eventBusClient } from '@flusk/resources/clients'
import { llmCallRepository } from '@flusk/resources/repositories'

/**
 * Before Create Hook Chain
 * Transforms and enriches input before database insert
 */
export async function beforeCreate(input: LLMCallCreate): Promise<LLMCallCreate> {
  // 1. Normalize provider (pure function)
  const provider = normalizeProvider(input.provider)
  
  // 2. Validate tokens (pure function)
  const validation = validateTokens({
    tokensInput: input.tokensInput,
    tokensOutput: input.tokensOutput,
    tokensCached: input.tokensCached,
  })
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
  }
  
  // 3. Hash prompt (pure function)
  const { promptHash } = hashPrompt({ promptText: input.promptText })
  
  // 4. Get pricing (resource call)
  const pricing = await pricingClient.getModelPricing(provider, input.model)
  
  // 5. Calculate cost (pure function)
  const { costUsd } = calculateCost({
    tokensInput: input.tokensInput,
    tokensOutput: input.tokensOutput,
    tokensCached: input.tokensCached,
    pricing,
  })
  
  return {
    ...input,
    provider,
    promptHash,
    costUsd,
  }
}

/**
 * After Create Hook Chain
 * Side effects after successful database insert
 */
export async function afterCreate(entity: LLMCall): Promise<void> {
  // Run in parallel — fire and forget
  await Promise.allSettled([
    // Queue embedding generation (resource call)
    queueEmbedding(entity),
    
    // Publish event (resource call)
    publishCreatedEvent(entity),
  ])
}

async function queueEmbedding(entity: LLMCall): Promise<void> {
  // Check if we should generate embedding
  if (entity.promptText.length > 100_000) {
    return // Skip very long prompts
  }
  
  try {
    const { embedding } = await embeddingClient.generate({
      text: entity.promptText,
    })
    
    await llmCallRepository.updateEmbedding(entity.id, embedding)
  } catch (error) {
    // Log but don't fail — embedding is non-critical
    console.error('Embedding generation failed:', error)
  }
}

async function publishCreatedEvent(entity: LLMCall): Promise<void> {
  await eventBusClient.publish('llm-calls', {
    type: 'llm-call.created',
    data: {
      id: entity.id,
      provider: entity.provider,
      model: entity.model,
      costUsd: entity.costUsd,
      organizationId: entity.organizationId,
    },
    timestamp: new Date().toISOString(),
  })
}
```

### 5.2 Routes

```typescript
// packages/execution/src/routes/llm-call.routes.ts

import { FastifyPluginAsync } from 'fastify'
import { Type } from '@sinclair/typebox'
import { LLMCallSchema, LLMCallCreateSchema } from '@flusk/types'
import { llmCallRepository } from '@flusk/resources/repositories'
import { beforeCreate, afterCreate } from '../hooks/llm-call.hooks'

export const llmCallRoutes: FastifyPluginAsync = async (fastify) => {
  
  // GET /api/v1/llm-calls
  fastify.get('/', {
    schema: {
      querystring: Type.Object({
        limit: Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
        offset: Type.Integer({ minimum: 0, default: 0 }),
        provider: Type.Optional(Type.String()),
        model: Type.Optional(Type.String()),
        organizationId: Type.Optional(Type.String({ format: 'uuid' })),
      }),
      response: {
        200: Type.Object({
          data: Type.Array(LLMCallSchema),
          pagination: Type.Object({
            total: Type.Integer(),
            limit: Type.Integer(),
            offset: Type.Integer(),
            hasMore: Type.Boolean(),
          }),
        }),
      },
    },
    handler: async (request, reply) => {
      const { limit, offset, ...filters } = request.query
      const { data, total } = await llmCallRepository.findMany(filters, { limit, offset })
      
      return {
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + data.length < total,
        },
      }
    },
  })
  
  // GET /api/v1/llm-calls/:id
  fastify.get('/:id', {
    schema: {
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: LLMCallSchema,
        404: Type.Object({ error: Type.String() }),
      },
    },
    handler: async (request, reply) => {
      const entity = await llmCallRepository.findById(request.params.id)
      
      if (!entity) {
        return reply.status(404).send({ error: 'LLM call not found' })
      }
      
      return entity
    },
  })
  
  // POST /api/v1/llm-calls
  fastify.post('/', {
    schema: {
      body: LLMCallCreateSchema,
      response: {
        201: LLMCallSchema,
      },
    },
    handler: async (request, reply) => {
      // Run before hooks (pure functions + resources)
      const enrichedInput = await beforeCreate(request.body)
      
      // Persist to database
      const entity = await llmCallRepository.create(enrichedInput)
      
      // Run after hooks (fire and forget)
      afterCreate(entity).catch(err => fastify.log.error(err))
      
      return reply.status(201).send(entity)
    },
  })
  
  // POST /api/v1/llm-calls/batch
  fastify.post('/batch', {
    schema: {
      body: Type.Object({
        items: Type.Array(LLMCallCreateSchema, { maxItems: 100 }),
      }),
      response: {
        201: Type.Object({
          data: Type.Array(LLMCallSchema),
          count: Type.Integer(),
        }),
      },
    },
    handler: async (request, reply) => {
      // Run before hooks on all items
      const enrichedInputs = await Promise.all(
        request.body.items.map(item => beforeCreate(item))
      )
      
      // Batch insert
      const entities = await llmCallRepository.createBatch(enrichedInputs)
      
      // Run after hooks (fire and forget)
      entities.forEach(entity => {
        afterCreate(entity).catch(err => fastify.log.error(err))
      })
      
      return reply.status(201).send({
        data: entities,
        count: entities.length,
      })
    },
  })
  
  // DELETE /api/v1/llm-calls/:id
  fastify.delete('/:id', {
    schema: {
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      response: {
        204: Type.Null(),
        404: Type.Object({ error: Type.String() }),
      },
    },
    handler: async (request, reply) => {
      const deleted = await llmCallRepository.softDelete(request.params.id)
      
      if (!deleted) {
        return reply.status(404).send({ error: 'LLM call not found' })
      }
      
      return reply.status(204).send()
    },
  })
  
  // GET /api/v1/llm-calls/:id/similar
  fastify.get('/:id/similar', {
    schema: {
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      querystring: Type.Object({
        limit: Type.Integer({ minimum: 1, maximum: 50, default: 10 }),
        threshold: Type.Number({ minimum: 0, maximum: 1, default: 0.85 }),
      }),
      response: {
        200: Type.Object({
          data: Type.Array(Type.Intersect([
            LLMCallSchema,
            Type.Object({ similarity: Type.Number() }),
          ])),
        }),
      },
    },
    handler: async (request, reply) => {
      const entity = await llmCallRepository.findById(request.params.id)
      
      if (!entity?.embedding) {
        return { data: [] }
      }
      
      const similar = await llmCallRepository.findSimilarByEmbedding(
        entity.embedding,
        request.query.limit,
        request.query.threshold
      )
      
      return { data: similar }
    },
  })
}
```

---

## 6. Dependency Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              execution                                    │
│  (routes, plugins, middleware, hooks)                                    │
│                                                                          │
│  Composes business-logic functions + resources                           │
└──────────────────────────────────────────────────────────────────────────┘
                    │                           │
                    │ uses                      │ uses
                    ▼                           ▼
┌─────────────────────────────┐   ┌─────────────────────────────────────────┐
│      business-logic         │   │              resources                   │
│  (pure functions)           │   │  (repositories, clients)                │
│                             │   │                                         │
│  • hashPrompt()             │   │  • llmCallRepository                    │
│  • calculateCost()          │   │  • pricingClient                        │
│  • validateTokens()         │   │  • embeddingClient                      │
│  • normalizeProvider()      │   │  • eventBusClient                       │
│                             │   │                                         │
│  NO I/O, NO SIDE EFFECTS    │   │  ALL I/O LIVES HERE                     │
└─────────────────────────────┘   └─────────────────────────────────────────┘
                    │                           │
                    │ imports                   │ imports
                    ▼                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              types                                        │
│  (TypeScript interfaces, JSON Schemas)                                   │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ derived from
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                             entities                                      │
│  (SOURCE OF TRUTH — schema definitions)                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 7. CLI Output Example

```bash
$ flusk g llm-call.entity.ts

🔧 Generating from: llm-call.entity.ts

  types/
    ✅ llm-call.types.ts
    ✅ llm-call.schema.json

  resources/
    ✅ repositories/llm-call.repository.ts
    ✅ migrations/001_llm-calls.sql

  business-logic/
    ✅ llm-call/hash-prompt.function.ts
    ✅ llm-call/calculate-cost.function.ts
    ✅ llm-call/validate-tokens.function.ts
    ✅ llm-call/normalize-provider.function.ts
    ✅ llm-call/index.ts

  execution/
    ✅ routes/llm-call.routes.ts
    ✅ plugins/llm-call.plugin.ts
    ✅ hooks/llm-call.hooks.ts

✨ Done in 0.8s


$ flusk g llm-call.entity.ts --business-logic false

🔧 Generating from: llm-call.entity.ts (skipping: business-logic)

  types/
    ✅ llm-call.types.ts
    ✅ llm-call.schema.json

  resources/
    ✅ repositories/llm-call.repository.ts
    ✅ migrations/001_llm-calls.sql

  execution/
    ✅ routes/llm-call.routes.ts
    ✅ plugins/llm-call.plugin.ts
    ✅ hooks/llm-call.hooks.ts

✨ Done in 0.5s


$ flusk g --all

🔧 Generating all entities...

  llm-call.entity.ts
    ✅ 11 files

  pattern.entity.ts
    ✅ 9 files

  conversion.entity.ts
    ✅ 8 files

  organization.entity.ts
    ✅ 7 files

  api-key.entity.ts
    ✅ 6 files

✨ Generated 41 files in 2.1s
```

---

## 8. Next Steps

1. ✅ Folder structure confirmed
2. ✅ Business-logic = pure functions (separate files)
3. ✅ Resources = data access only (repositories + clients)
4. ✅ Removed "generated" from all paths

**Ready to implement?**
- Create the actual `packages/entities/src/llm-call.entity.ts`
- Create the CLI generators
- Wire up Platformatic Watt
