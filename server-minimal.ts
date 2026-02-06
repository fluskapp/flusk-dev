/**
 * Flusk Minimal Server - E2E Testing
 * Simple Fastify server for demonstration and testing
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import crypto from 'crypto';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

// Enable CORS
await fastify.register(cors, {
  origin: true
});

// In-memory storage for demo
interface LLMCall {
  id: string;
  organizationId: string;
  provider: string;
  model: string;
  prompt: string;
  promptHash: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  response: string;
  cached: boolean;
  timestamp: string;
}

interface Pattern {
  id: string;
  organizationId: string;
  promptHash: string;
  occurrenceCount: number;
  totalCost: number;
  avgTokens: number;
  firstSeen: string;
  lastSeen: string;
}

interface Suggestion {
  id: string;
  patternId: string;
  type: 'cache' | 'downgrade' | 'remove';
  description: string;
  estimatedMonthlySavings: number;
  confidence: number;
}

const llmCalls: Map<string, LLMCall> = new Map();
const patterns: Map<string, Pattern> = new Map();
const suggestions: Map<string, Suggestion> = new Map();

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.get('/health/ready', async () => {
  return {
    status: 'ready',
    timestamp: new Date().toISOString(),
    stats: {
      llmCalls: llmCalls.size,
      patterns: patterns.size,
      suggestions: suggestions.size
    }
  };
});

// Track LLM call
fastify.post('/api/v1/llm-calls', async (request, reply) => {
  const body = request.body as any;

  const promptHash = crypto
    .createHash('sha256')
    .update(body.prompt || '')
    .digest('hex');

  const llmCall: LLMCall = {
    id: crypto.randomUUID(),
    organizationId: body.organizationId || 'default-org',
    provider: body.provider,
    model: body.model,
    prompt: body.prompt,
    promptHash,
    tokens: body.tokens,
    cost: body.cost || 0,
    response: body.response || '',
    cached: false,
    timestamp: new Date().toISOString()
  };

  llmCalls.set(llmCall.id, llmCall);

  // Update pattern
  updatePattern(llmCall);

  return reply.status(201).send(llmCall);
});

// Get LLM call by ID
fastify.get('/api/v1/llm-calls/:id', async (request, reply) => {
  const { id } = request.params as any;
  const call = llmCalls.get(id);

  if (!call) {
    return reply.status(404).send({ error: 'LLM call not found' });
  }

  return call;
});

// List LLM calls
fastify.get('/api/v1/llm-calls', async (request) => {
  const query = request.query as any;
  const organizationId = query.organizationId || 'default-org';

  const filtered = Array.from(llmCalls.values())
    .filter(call => call.organizationId === organizationId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, query.limit || 20);

  return {
    data: filtered,
    pagination: {
      total: filtered.length,
      limit: query.limit || 20,
      offset: 0,
      hasMore: false
    }
  };
});

// Trigger pattern analysis
fastify.post('/api/v1/patterns/analyze', async (request) => {
  const body = request.body as any;
  const organizationId = body?.organizationId || 'default-org';

  // Analyze patterns and generate suggestions
  const newSuggestions = analyzePatterns(organizationId);

  return {
    success: true,
    message: 'Pattern analysis completed',
    suggestionsGenerated: newSuggestions.length,
    patterns: patterns.size,
    timestamp: new Date().toISOString()
  };
});

// Get patterns
fastify.get('/api/v1/patterns', async (request) => {
  const query = request.query as any;
  const organizationId = query.organizationId || 'default-org';

  const filtered = Array.from(patterns.values())
    .filter(pattern => pattern.organizationId === organizationId);

  return {
    data: filtered,
    total: filtered.length
  };
});

// Get suggestions
fastify.get('/api/v1/conversions/suggestions/:orgId', async (request) => {
  const { orgId } = request.params as any;

  const filtered = Array.from(suggestions.values())
    .filter(suggestion => {
      const pattern = patterns.get(suggestion.patternId);
      return pattern?.organizationId === orgId;
    });

  return {
    data: filtered,
    total: filtered.length
  };
});

// Helper: Update pattern
function updatePattern(call: LLMCall): void {
  const existing = patterns.get(call.promptHash);

  if (existing) {
    existing.occurrenceCount++;
    existing.totalCost += call.cost;
    existing.avgTokens = Math.round(
      (existing.avgTokens * (existing.occurrenceCount - 1) + call.tokens.total) /
        existing.occurrenceCount
    );
    existing.lastSeen = call.timestamp;
  } else {
    patterns.set(call.promptHash, {
      id: crypto.randomUUID(),
      organizationId: call.organizationId,
      promptHash: call.promptHash,
      occurrenceCount: 1,
      totalCost: call.cost,
      avgTokens: call.tokens.total,
      firstSeen: call.timestamp,
      lastSeen: call.timestamp
    });
  }
}

// Helper: Analyze patterns and generate suggestions
function analyzePatterns(organizationId: string): Suggestion[] {
  const newSuggestions: Suggestion[] = [];

  for (const pattern of patterns.values()) {
    if (pattern.organizationId !== organizationId) continue;
    if (pattern.occurrenceCount < 2) continue; // Need at least 2 occurrences

    // Check if suggestion already exists
    const existingSuggestion = Array.from(suggestions.values()).find(
      s => s.patternId === pattern.id
    );
    if (existingSuggestion) continue;

    // Generate cache suggestion for repeated prompts
    if (pattern.occurrenceCount >= 2) {
      const monthlyCalls = pattern.occurrenceCount * 30; // Estimate monthly
      const monthlyCost = pattern.totalCost * 30;
      const cacheSavings = monthlyCost * 0.95; // 95% savings with cache

      const suggestion: Suggestion = {
        id: crypto.randomUUID(),
        patternId: pattern.id,
        type: 'cache',
        description: `Cache this prompt to avoid redundant API calls. Detected ${pattern.occurrenceCount} identical calls.`,
        estimatedMonthlySavings: Math.round(cacheSavings * 100) / 100,
        confidence: Math.min(pattern.occurrenceCount / 10, 0.95)
      };

      suggestions.set(suggestion.id, suggestion);
      newSuggestions.push(suggestion);
    }
  }

  return newSuggestions;
}

// Start server
const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`✅ Flusk server running at http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
