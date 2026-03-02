#!/bin/bash
# Note: not using set -e to allow tests to fail gracefully

# 🔍 Flusk Deployment Verification Script
# Tests the application before deploying to ensure everything works

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

success() {
    echo -e "${GREEN}✅${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local test_name="$1"
    local command="$2"
    
    log "Testing: $test_name"
    
    if eval "$command" >/dev/null 2>&1; then
        success "$test_name"
        ((TESTS_PASSED++))
    else
        error "$test_name"
        ((TESTS_FAILED++))
    fi
}

log "🔍 Starting deployment verification..."
echo ""

# Prerequisites checks
log "📋 Checking prerequisites..."
run_test "Node.js installed" "node --version"
run_test "pnpm installed" "pnpm --version"
run_test "Docker running" "docker info"
if command -v gcloud >/dev/null 2>&1; then
    success "gcloud installed"
    ((TESTS_PASSED++))
else
    warn "gcloud not installed (required for deployment)"
fi

echo ""

# Project structure checks
log "📁 Checking project structure..."
run_test "package.json exists" "test -f package.json"
run_test "Dockerfile exists" "test -f Dockerfile"
run_test "server.ts exists" "test -f server.ts"
run_test "docker-entrypoint.sh exists" "test -f scripts/docker-entrypoint.sh"
run_test "docker-entrypoint.sh executable" "test -x scripts/docker-entrypoint.sh"

echo ""

# Dependencies and build
log "🏗️ Testing build process..."
log "Installing dependencies..."
pnpm install --frozen-lockfile >/dev/null 2>&1
success "Dependencies installed"

log "Building project..."
pnpm build >/dev/null 2>&1
success "Build completed"

echo ""

# Tests
log "🧪 Running tests..."
if pnpm test >/dev/null 2>&1; then
    success "All tests passing"
    ((TESTS_PASSED++))
else
    error "Tests failed"
    ((TESTS_FAILED++))
    warn "Run 'pnpm test' to see details"
fi

echo ""

# Docker build test
log "🐳 Testing Docker build..."
if docker build -t flusk-test . >/dev/null 2>&1; then
    success "Docker build successful"
    ((TESTS_PASSED++))
    
    # Clean up test image
    docker rmi flusk-test >/dev/null 2>&1 || true
else
    error "Docker build failed"
    ((TESTS_FAILED++))
fi

echo ""

# Environment variables check
log "🔐 Checking environment setup..."
if [[ -f .env ]]; then
    success ".env file exists"
    ((TESTS_PASSED++))
    
    # Check for required variables
    if grep -q "FLUSK_API_KEY" .env && grep -q "FLUSK_HMAC_SECRET" .env; then
        success "Required environment variables found"
        ((TESTS_PASSED++))
    else
        error "Missing required environment variables"
        ((TESTS_FAILED++))
    fi
else
    warn ".env file not found (will use secrets in production)"
fi

echo ""

# Configuration checks
log "⚙️ Checking configuration..."
run_test "Package.json has start script" "grep -q '\"start\"' package.json"
run_test "TypeScript config exists" "test -f tsconfig.json || test -f packages/*/tsconfig.json"

echo ""

# Summary
log "📊 Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Tests Passed:${NC} $TESTS_PASSED"
echo -e "  ${RED}Tests Failed:${NC} $TESTS_FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $TESTS_FAILED -eq 0 ]; then
    success "🎉 All checks passed! Ready for deployment."
    echo ""
    log "Next steps:"
    echo "  1. Run: ./scripts/deploy-gcp.sh"
    echo "  2. Or use GitHub Actions for CI/CD"
    echo ""
    exit 0
else
    error "⚠️ $TESTS_FAILED checks failed. Please fix issues before deployment."
    echo ""
    log "Common fixes:"
    echo "  • Install missing dependencies"
    echo "  • Fix failing tests"
    echo "  • Ensure Docker is running"
    echo "  • Check file permissions"
    echo ""
    exit 1
fi