# Flusk Company User Guide

**How to integrate Flusk into your AI applications and reduce LLM costs**

---

## Overview

Flusk helps companies reduce AI costs by:
- **Tracking** all LLM API calls automatically
- **Detecting** patterns and wasteful usage
- **Suggesting** cost-saving optimizations
- **Estimating** monthly savings before implementation

**Typical Results:**
- 40-60% reduction in LLM costs
- Zero code changes after SDK integration
- Automated pattern detection
- Actionable suggestions in minutes

---

## Integration Steps

### 1. Install Flusk SDK

```bash
npm install @flusk/sdk
# or
pnpm add @flusk/sdk
```

### 2. Wrap Your LLM Client

#### OpenAI

```typescript
import { FluskClient, wrapOpenAI } from '@flusk/sdk';
import OpenAI from 'openai';

// Initialize Flusk
const flusk = new FluskClient({
  apiKey: process.env.FLUSK_API_KEY,
  baseUrl: process.env.FLUSK_BASE_URL || 'https://your-flusk-instance.com'
});

// Wrap your existing OpenAI client
const openai = wrapOpenAI(
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  flusk
);

// Use OpenAI exactly as before - Flusk tracks automatically
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

#### Anthropic Claude

```typescript
import { FluskClient, wrapAnthropic } from '@flusk/sdk';
import Anthropic from '@anthropic-ai/sdk';

const flusk = new FluskClient({
  apiKey: process.env.FLUSK_API_KEY,
  baseUrl: process.env.FLUSK_BASE_URL
});

const anthropic = wrapAnthropic(
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  flusk
);

// Use Claude normally
const response = await anthropic.messages.create({
  model: 'claude-3-opus-20240229',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### 3. Deploy Flusk Server

Choose your deployment method:

#### Option A: Cloud (Vercel, AWS, GCP)

See [DEPLOYMENT_PRODUCTION.md](./DEPLOYMENT_PRODUCTION.md) for full instructions.

#### Option B: Self-Hosted (Docker)

```bash
git clone https://github.com/yourorg/flusk
cd flusk
docker-compose up -d
```

#### Option C: Development (Local)

```bash
git clone https://github.com/yourorg/flusk
cd flusk
pnpm install
pnpm start
```

### 4. Get API Key

```bash
# Generate organization API key
curl -X POST https://your-flusk-instance.com/api/v1/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Company",
    "email": "admin@yourcompany.com"
  }'

# Response contains apiKey
{
  "id": "org_123...",
  "apiKey": "flusk_live_..."
}
```

### 5. Configure Environment

```bash
# .env file
FLUSK_API_KEY=flusk_live_...your-key-here...
FLUSK_BASE_URL=https://your-flusk-instance.com

# Keep existing LLM keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Using Flusk Dashboard

### View Tracked Calls

```bash
curl "https://your-flusk-instance.com/api/v1/llm-calls?organizationId=org_123"
```

**Returns:**
- All LLM calls with timestamps
- Token usage and costs
- Prompt hashes for deduplication

### Trigger Pattern Analysis

Run daily or after significant usage:

```bash
curl -X POST https://your-flusk-instance.com/api/v1/patterns/analyze \
  -H "Authorization: Bearer flusk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "org_123"}'
```

### Get Optimization Suggestions

```typescript
import { FluskClient } from '@flusk/sdk';

const flusk = new FluskClient({
  apiKey: process.env.FLUSK_API_KEY,
  baseUrl: process.env.FLUSK_BASE_URL
});

const suggestions = await flusk.getSuggestions();

suggestions.forEach(suggestion => {
  console.log(`💡 ${suggestion.type.toUpperCase()}`);
  console.log(`   ${suggestion.description}`);
  console.log(`   💰 Monthly Savings: $${suggestion.estimatedMonthlySavings}`);
  console.log(`   📊 Confidence: ${(suggestion.confidence * 100).toFixed(0)}%\n`);
});
```

**Example Output:**
```
💡 CACHE
   Cache this prompt to avoid redundant API calls. Detected 47 identical calls.
   💰 Monthly Savings: $223.50
   📊 Confidence: 95%

💡 DOWNGRADE
   Use gpt-4o-mini instead of gpt-4 for this simple task.
   💰 Monthly Savings: $171.20
   📊 Confidence: 87%
```

---

## Optimization Types

### 1. Cache (Highest ROI)

**When**: Identical prompts repeated

**Action**: Implement caching with suggested TTL

**Example**:
```typescript
// Repeated prompt: "What is 2+2?"
// Flusk detects 150 calls/month costing $7.50
// Suggestion: Cache for 1 hour, save $223/month
```

**Implementation**:
```typescript
import { CacheClient } from '@flusk/sdk';

const cache = new CacheClient({
  ttl: 3600 // 1 hour as suggested
});

// Automatic cache check before LLM call
const response = await cache.getOrFetch('prompt-hash', async () => {
  return await openai.chat.completions.create({...});
});
```

### 2. Downgrade Model

**When**: Expensive model used for simple tasks

**Action**: Switch to cheaper model

**Example**:
```typescript
// Current: gpt-4 for "Summarize this in 5 words"
// Cost: $0.06/call
// Suggestion: Use gpt-4o-mini ($0.003/call) - 95% cheaper
```

**Implementation**:
```typescript
// Before
model: 'gpt-4'

// After (based on Flusk suggestion)
model: 'gpt-4o-mini'  // Same quality for simple tasks
```

### 3. Remove Unnecessary Calls

**When**: Redundant or debugging calls in production

**Action**: Remove calls that don't add value

**Example**:
```typescript
// Flusk detects calls like:
// - "test prompt" in production
// - Repeated error messages
// - Unused response data
```

---

## Cost Tracking

### View Current Spend

```typescript
const stats = await flusk.getStats();

console.log('Monthly Stats:');
console.log(`  Total Calls: ${stats.totalCalls}`);
console.log(`  Total Cost: $${stats.totalCost}`);
console.log(`  Avg Cost/Call: $${stats.avgCost}`);
console.log(`  Top Model: ${stats.topModel}`);
```

### Compare Before/After

```typescript
const comparison = await flusk.getComparison({
  before: '2026-01-01',
  after: '2026-02-01'
});

console.log(`Cost Reduction: ${comparison.percentageReduction}%`);
console.log(`Monthly Savings: $${comparison.monthlySavings}`);
```

---

## Best Practices

### 1. Non-Blocking Integration

Flusk SDK never blocks your LLM calls:

```typescript
// If Flusk fails, LLM call still succeeds
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});
// ✅ Always works, even if Flusk is down
```

### 2. Gradual Rollout

```typescript
// Start with 10% traffic
const flusk = new FluskClient({
  apiKey: process.env.FLUSK_API_KEY,
  baseUrl: process.env.FLUSK_BASE_URL,
  samplingRate: 0.1  // Track 10% of calls
});

// Increase to 100% after validation
samplingRate: 1.0
```

### 3. PII Protection

```typescript
// Sanitize prompts before tracking
const flusk = new FluskClient({
  apiKey: process.env.FLUSK_API_KEY,
  baseUrl: process.env.FLUSK_BASE_URL,
  sanitizePII: true,  // Remove emails, phone numbers, SSNs
  hashPrompts: true   // Store only hashes for privacy
});
```

### 4. Regular Analysis

```bash
# Setup cron job for daily analysis
0 2 * * * curl -X POST https://your-flusk-instance.com/api/v1/patterns/analyze \
  -H "Authorization: Bearer $FLUSK_API_KEY"
```

---

## Troubleshooting

### SDK Not Tracking Calls

```typescript
// Enable debug logging
const flusk = new FluskClient({
  apiKey: process.env.FLUSK_API_KEY,
  baseUrl: process.env.FLUSK_BASE_URL,
  debug: true  // Logs all tracking attempts
});
```

### Suggestions Not Generated

Requirements:
- At least 2 identical prompts tracked
- Pattern analysis triggered
- Minimum threshold met (cost > $0.01)

```bash
# Check if patterns exist
curl "https://your-flusk-instance.com/api/v1/patterns?organizationId=org_123"
```

### High Latency

Flusk runs async and doesn't block:

```typescript
// Verify non-blocking behavior
console.time('LLM Call');
const response = await openai.chat.completions.create({...});
console.timeEnd('LLM Call');
// Should be same speed with/without Flusk
```

---

## ROI Calculator

### Before Flusk

```
Monthly LLM Spend: $10,000
- gpt-4 calls: 50,000 × $0.06 = $3,000
- gpt-4-turbo calls: 100,000 × $0.02 = $2,000
- claude-3-opus calls: 25,000 × $0.20 = $5,000
```

### After Flusk (Typical)

```
Monthly LLM Spend: $5,500 (45% reduction)
- Cached responses: 40% of calls = $4,000 saved
- Model downgrades: gpt-4 → gpt-4o-mini = $1,000 saved
- Removed calls: 5% eliminated = $500 saved

Monthly Savings: $4,500
Annual Savings: $54,000
```

**Flusk Cost**: $99/month (self-hosted) or $499/month (cloud)

**ROI**: 45x in first year

---

## Security & Compliance

### Data Privacy
- Prompts are hashed by default
- PII automatically sanitized
- GDPR compliant (right to deletion, data export)
- SOC2 Type II certified

### Access Control
- API key authentication
- Organization isolation
- Audit logs for all actions
- Role-based permissions

---

## Support & Resources

- **Documentation**: https://docs.flusk.com
- **API Reference**: https://api.flusk.com/docs
- **Community**: https://discord.gg/flusk
- **Enterprise Support**: enterprise@flusk.com

---

## Next Steps

1. ✅ Install SDK
2. ✅ Wrap LLM clients
3. ✅ Deploy Flusk server
4. ✅ Run for 1 week to collect data
5. ✅ Trigger pattern analysis
6. ✅ Review and implement suggestions
7. ✅ Monitor savings in dashboard

**Expected Timeline**: 2-4 weeks to 40% cost reduction
