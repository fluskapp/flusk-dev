# Flusk E2E Testing Guide

Complete guide for testing Flusk end-to-end as a user.

---

## Prerequisites

- **Node.js 22+** installed
- **pnpm 8+** installed
- **OpenAI API key** (for example testing)

---

## Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
cd /Users/user/projects/flusk
pnpm install
```

### Step 2: Build Packages

```bash
# Build CLI and packages (execution package will fail, that's OK)
pnpm build 2>/dev/null || true

# What builds successfully:
# ✅ @flusk/entities
# ✅ @flusk/types
# ✅ @flusk/business-logic
# ✅ @flusk/resources
# ✅ @flusk/cli
# ❌ @flusk/execution (has errors, but not needed for testing)
```

### Step 3: Start Flusk Server

```bash
# Terminal 1: Start the minimal server
pnpm start

# You should see:
# ✅ Flusk server running at http://0.0.0.0:3000
# 📊 Health check: http://0.0.0.0:3000/health
```

### Step 4: Verify Server

```bash
# Terminal 2: Check health
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2026-02-06T..."}
```

### Step 5: Setup Example

```bash
cd examples

# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
nano .env  # or use any editor
```

**Required .env content:**
```bash
OPENAI_API_KEY=sk-...your-key-here...
FLUSK_API_KEY=test_org_key
FLUSK_BASE_URL=http://localhost:3000
```

### Step 6: Run E2E Example

```bash
# Still in examples/ directory
pnpm start

# Expected output:
# 🚀 Starting Flusk E2E Example
# 📊 Making LLM calls...
#   → Call 1-3: Repeated math question
#     ✓ Call 1 completed
#     ✓ Call 2 completed
#     ✓ Call 3 completed
#   → Call 4-5: Repeated general knowledge
#     ✓ Call 4 completed
#     ✓ Call 5 completed
#   → Call 6-7: Unique prompts
#     ✓ Call 6 completed
#     ✓ Call 7 completed
# 🔍 Triggering pattern analysis...
#   ✓ Pattern analysis triggered
# 💰 Getting optimization suggestions...
#
# 📊 Optimization Suggestions:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Suggestion #1
#   Type: cache
#   Description: Cache this prompt to avoid redundant API calls. Detected 3 identical calls.
#   Monthly Savings: $XX.XX
#   Confidence: XX%
```

---

## Manual Testing Steps

### Test 1: Health Check

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
```

**Expected:** JSON responses with `status: "ok"` and `status: "ready"`

### Test 2: Track LLM Call

```bash
curl -X POST http://localhost:3000/api/v1/llm-calls \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "test-org",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "prompt": "What is 2+2?",
    "tokens": {
      "input": 10,
      "output": 5,
      "total": 15
    },
    "cost": 0.0001,
    "response": "4"
  }'
```

**Expected:** 201 Created with LLM call object containing `id`, `promptHash`, etc.

### Test 3: List LLM Calls

```bash
curl "http://localhost:3000/api/v1/llm-calls?organizationId=test-org"
```

**Expected:** Array of tracked LLM calls

### Test 4: Trigger Pattern Analysis

```bash
curl -X POST http://localhost:3000/api/v1/patterns/analyze \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "test-org"}'
```

**Expected:** Success message with pattern analysis results

### Test 5: Get Optimization Suggestions

```bash
curl http://localhost:3000/api/v1/conversions/suggestions/test-org
```

**Expected:** Array of suggestions with `type`, `description`, `estimatedMonthlySavings`

---

## Testing with SDK

### Install SDK

```bash
cd your-project
npm install @flusk/sdk openai
```

### Use in Your Code

```typescript
import { FluskClient, wrapOpenAI } from '@flusk/sdk';
import OpenAI from 'openai';

// Initialize Flusk
const flusk = new FluskClient({
  apiKey: 'test_org_key',
  baseUrl: 'http://localhost:3000'
});

// Wrap OpenAI client
const openai = wrapOpenAI(new OpenAI(), flusk);

// Use OpenAI normally - Flusk tracks automatically
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Get suggestions
const suggestions = await flusk.getSuggestions();
console.log('Savings:', suggestions);
```

---

## API Endpoints Reference

### Health

- `GET /health` - Basic health check
- `GET /health/ready` - Detailed health with stats

### LLM Calls

- `POST /api/v1/llm-calls` - Track new LLM call
- `GET /api/v1/llm-calls` - List all calls (query: `organizationId`, `limit`)
- `GET /api/v1/llm-calls/:id` - Get specific call

### Patterns

- `POST /api/v1/patterns/analyze` - Trigger pattern detection
- `GET /api/v1/patterns` - List detected patterns (query: `organizationId`)

### Suggestions

- `GET /api/v1/conversions/suggestions/:orgId` - Get optimization suggestions

---

## Troubleshooting

### Server Won't Start

```bash
# Check if port 3000 is already in use
lsof -i :3000

# Kill existing process
kill -9 <PID>

# Or use different port
PORT=3001 pnpm start
```

### Build Errors

The execution package will fail to build - this is expected. The minimal server bypasses it.

```bash
# Build only what's needed
cd packages/cli && pnpm build && cd ../..
cd packages/sdk/node && pnpm build && cd ../../..
```

### Example Fails

```bash
# Check .env file exists
ls -la examples/.env

# Verify OpenAI API key is set
cat examples/.env | grep OPENAI_API_KEY

# Test OpenAI key separately
node -e "import('openai').then(m => new m.default({apiKey: process.env.OPENAI_API_KEY}).models.list())"
```

### No Suggestions Generated

Suggestions require at least 2 identical prompts. Make sure:
1. Same prompt text is used multiple times
2. Pattern analysis was triggered: `POST /api/v1/patterns/analyze`
3. Check patterns exist: `GET /api/v1/patterns`

---

## Expected Results

After running the E2E example, you should see:

### ✅ Successfully Tracked Calls
- 7 LLM calls tracked
- 2 patterns detected (repeated prompts)
- 1-2 optimization suggestions generated

### ✅ Cost Savings Identified
- Cache suggestions for repeated prompts
- Monthly savings estimates
- Confidence scores

### ✅ Working API
- All endpoints respond
- Data persists in memory during session
- Clean JSON responses

---

## Next Steps

1. **Production Deployment**: See [DEPLOYMENT_PRODUCTION.md](./DEPLOYMENT_PRODUCTION.md)
2. **Company Integration**: See [COMPANY_USER_GUIDE.md](./COMPANY_USER_GUIDE.md)
3. **CLI Usage**: See [CLI_USAGE.md](./CLI_USAGE.md)

---

## Support

If issues persist:
1. Check server logs in Terminal 1
2. Verify all prerequisites are met
3. Review BUILD_STATUS.md for known issues
4. Check examples/package.json has correct dependencies
