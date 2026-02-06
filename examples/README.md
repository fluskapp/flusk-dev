# Flusk Examples

This directory contains working examples demonstrating how to use the Flusk platform.

## AI Agent with Flusk

The `ai-agent-with-flusk.ts` example shows a complete end-to-end workflow:

1. Initialize Flusk SDK client
2. Wrap OpenAI client for automatic tracking
3. Make multiple LLM calls (including repeated prompts)
4. Trigger pattern analysis
5. Fetch automation suggestions
6. Display potential savings

### Setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Edit `.env` and add your OpenAI API key:

```bash
OPENAI_API_KEY=sk-...
```

### Running the Example

#### With Flusk Server Running

First, start the Flusk server in another terminal:

```bash
# From the project root
pnpm start
```

Then run the example:

```bash
# From the examples directory
pnpm start
```

#### Expected Output

```
🚀 Starting Flusk E2E Example

📊 Making LLM calls...

  → Call 1-3: Repeated math question
    ✓ Call 1 completed
    ✓ Call 2 completed
    ✓ Call 3 completed

  → Call 4-5: Repeated general knowledge
    ✓ Call 4 completed
    ✓ Call 5 completed

  → Call 6-7: Unique prompts
    ✓ Call 6 completed
    ✓ Call 7 completed

🔍 Triggering pattern analysis...
  ✓ Pattern analysis triggered

💡 Fetching automation suggestions...

🎯 Automation Suggestions:

  1. Cache repeated "What is 2+2?" calls
     Call Pattern: gpt-4o-mini|What is 2+2?
     Frequency: 3 calls
     Current Cost: $0.0012
     Potential Savings: $0.0008/month
     Confidence: 95%
     Status: pending

  2. Cache repeated capital question
     Call Pattern: gpt-4o-mini|What is the capital of France?
     Frequency: 2 calls
     Current Cost: $0.0008
     Potential Savings: $0.0004/month
     Confidence: 90%
     Status: pending

  💰 Total Potential Savings: $1.20/month

✅ Example completed!
```

### What's Happening?

1. **Wrapping the OpenAI Client**: The `wrapOpenAI()` function intercepts all calls to `openai.chat.completions.create()` and automatically sends tracking data to Flusk.

2. **Repeated Calls**: The example makes the same prompt multiple times to simulate a real AI agent with repetitive behavior.

3. **Pattern Detection**: Flusk analyzes the tracked calls to identify patterns:
   - Exact duplicates → Suggest caching
   - Similar prompts → Suggest deduplication
   - Deterministic tasks → Suggest automation

4. **Suggestions**: Based on detected patterns, Flusk generates suggestions with:
   - Estimated cost savings
   - Confidence scores
   - Recommended automation type
   - Implementation configuration

### Next Steps

- Try modifying the prompts to see different patterns
- Experiment with different models to see cost differences
- Add more repeated calls to increase savings estimates
- Explore the Flusk dashboard to visualize patterns

## Troubleshooting

### "Failed to track LLM call: 401"

Make sure your `FLUSK_API_KEY` matches the key expected by the server. For local development, use `test_org_key`.

### "Failed to track LLM call: Connection refused"

Make sure the Flusk server is running:

```bash
# From project root
pnpm start
```

### "OpenAI API error"

Verify your `OPENAI_API_KEY` is valid:

```bash
echo $OPENAI_API_KEY
```

Get a key from: https://platform.openai.com/api-keys
