#!/bin/bash
# Flusk E2E Test Script
# Automated testing script for end-to-end functionality

set -e  # Exit on error

echo "🚀 Flusk E2E Test Suite"
echo "======================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

# Test 1: Check Node.js version
echo "Test 1: Node.js version"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 22 ]; then
    pass "Node.js $NODE_VERSION >= 22"
else
    fail "Node.js $NODE_VERSION < 22 (need 22+)"
fi
echo ""

# Test 2: Check pnpm installation
echo "Test 2: pnpm installation"
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm -v)
    pass "pnpm $PNPM_VERSION installed"
else
    fail "pnpm not installed"
fi
echo ""

# Test 3: Install dependencies
echo "Test 3: Dependencies"
pnpm install --no-frozen-lockfile --silent 2>&1 > /dev/null
if [ $? -eq 0 ]; then
    pass "Dependencies installed"
else
    fail "Dependencies installation failed"
fi
echo ""

# Test 4: Build CLI
echo "Test 4: Build CLI"
cd packages/cli
if pnpm build --silent 2>&1 | grep -q "Done"; then
    pass "CLI built successfully"
else
    fail "CLI build failed"
fi
cd ../..
echo ""

# Test 5: CLI executable
echo "Test 5: CLI executable"
if node packages/cli/dist/bin/flusk.js --help | grep -q "Usage"; then
    pass "CLI works"
else
    fail "CLI not working"
fi
echo ""

# Test 6: Server file exists
echo "Test 6: Server files"
if [ -f "server-minimal.ts" ]; then
    pass "Server file exists"
else
    fail "Server file missing"
fi
echo ""

# Test 7: Start server (background)
echo "Test 7: Start server"
# Kill any existing process on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

pnpm start > /tmp/flusk-server.log 2>&1 &
SERVER_PID=$!
sleep 5  # Give server more time to start

# Test 8: Health check
echo "Test 8: Health endpoint"
if curl -s http://localhost:3000/health | grep -q "ok"; then
    pass "Health endpoint responds"
else
    fail "Health endpoint not responding"
fi
echo ""

# Test 9: Health ready endpoint
echo "Test 9: Health ready endpoint"
if curl -s http://localhost:3000/health/ready | grep -q "ready"; then
    pass "Health ready endpoint responds"
else
    fail "Health ready endpoint not responding"
fi
echo ""

# Test 10: Track LLM call
echo "Test 10: Track LLM call"
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/llm-calls \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "test-org",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "prompt": "Test prompt",
    "tokens": {"input": 10, "output": 5, "total": 15},
    "cost": 0.0001,
    "response": "Test response"
  }')

if echo "$RESPONSE" | grep -q "promptHash"; then
    pass "LLM call tracked"
else
    fail "LLM call tracking failed"
fi
echo ""

# Test 11: List LLM calls
echo "Test 11: List LLM calls"
if curl -s "http://localhost:3000/api/v1/llm-calls?organizationId=test-org" | grep -q "data"; then
    pass "List LLM calls works"
else
    fail "List LLM calls failed"
fi
echo ""

# Test 12: Trigger pattern analysis
echo "Test 12: Pattern analysis"
if curl -s -X POST http://localhost:3000/api/v1/patterns/analyze \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "test-org"}' | grep -q "success"; then
    pass "Pattern analysis works"
else
    fail "Pattern analysis failed"
fi
echo ""

# Test 13: Get suggestions
echo "Test 13: Get suggestions"
if curl -s http://localhost:3000/api/v1/conversions/suggestions/test-org | grep -q "data"; then
    pass "Get suggestions works"
else
    fail "Get suggestions failed"
fi
echo ""

# Stop server
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null || true
sleep 1
echo ""

# Summary
echo "======================="
echo "Test Results"
echo "======================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run example: cd examples && pnpm start"
    echo "2. Deploy: vercel --prod"
    echo "3. Read docs: docs/COMPANY_USER_GUIDE.md"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check BUILD_STATUS.md"
    echo "2. See docs/E2E_TESTING_GUIDE.md"
    echo "3. Run: pnpm clean && pnpm install"
    exit 1
fi
