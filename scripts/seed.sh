#!/bin/sh
# Seed example data into Flusk for demo purposes
set -e

API_URL="${FLUSK_API_URL:-http://localhost:3000}"

echo "🌱 Seeding example data into Flusk..."

# Record some example LLM calls
curl -s -X POST "$API_URL/api/v1/llm-calls" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${FLUSK_API_KEY:-test_org_key}" \
  -d '{
    "organizationId": "demo-org",
    "provider": "openai",
    "model": "gpt-4",
    "prompt": "Explain quantum computing in simple terms",
    "response": "Quantum computing uses quantum bits...",
    "promptTokens": 8,
    "completionTokens": 150,
    "totalTokens": 158,
    "latencyMs": 2340
  }' && echo " ✅ LLM call 1"

curl -s -X POST "$API_URL/api/v1/llm-calls" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${FLUSK_API_KEY:-test_org_key}" \
  -d '{
    "organizationId": "demo-org",
    "provider": "openai",
    "model": "gpt-4",
    "prompt": "Explain quantum computing in simple terms",
    "response": "Quantum computing leverages qubits...",
    "promptTokens": 8,
    "completionTokens": 145,
    "totalTokens": 153,
    "latencyMs": 2100
  }' && echo " ✅ LLM call 2 (duplicate prompt)"

curl -s -X POST "$API_URL/api/v1/llm-calls" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${FLUSK_API_KEY:-test_org_key}" \
  -d '{
    "organizationId": "demo-org",
    "provider": "anthropic",
    "model": "claude-3-opus-20240229",
    "prompt": "Write a haiku about programming",
    "response": "Code flows like water...",
    "promptTokens": 7,
    "completionTokens": 20,
    "totalTokens": 27,
    "latencyMs": 890
  }' && echo " ✅ LLM call 3"

echo ""
echo "✅ Seed data inserted. Check http://localhost:3000/api/v1/llm-calls"
