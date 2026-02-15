#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "Starting mock OpenAI server..."
node examples/mock-openai-server.js &
MOCK_PID=$!
sleep 1

echo "Running Flusk analyze..."
OPENAI_BASE_URL=http://localhost:18923/v1 \
FLUSK_PROFILE_MODE=off \
  npx tsx packages/cli/bin/flusk.ts analyze examples/demo-app.js --duration 30

echo "Cleaning up..."
kill $MOCK_PID 2>/dev/null || true
