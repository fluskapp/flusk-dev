/**
 * LLM, security, logging, and dev tool sections for .env.example.
 */

export function envLlmSection(): string {
  return `# ============================================
# LLM API Keys
# ============================================

# OpenAI API Configuration
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic API Configuration
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BASE_URL=https://api.anthropic.com

# Google AI (Gemini) Configuration
GOOGLE_AI_API_KEY=
GOOGLE_AI_BASE_URL=https://generativelanguage.googleapis.com

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT_NAME=
AZURE_OPENAI_API_VERSION=2024-02-15-preview`;
}

export function envFluskSection(): string {
  return `# ============================================
# Flusk Platform
# ============================================

# Flusk API authentication
FLUSK_API_KEY=test_org_key

# Pattern detection settings
FLUSK_PATTERN_MIN_OCCURRENCES=3
FLUSK_PATTERN_CONFIDENCE_THRESHOLD=0.85

# Cache settings
FLUSK_CACHE_TTL=3600
FLUSK_CACHE_MAX_SIZE=1000`;
}

export function envSecuritySection(): string {
  return `# ============================================
# Security & Authentication
# ============================================

# JWT secret for API authentication (generate with: openssl rand -hex 32)
JWT_SECRET=your-super-secret-jwt-key-change-me-in-production

# JWT expiration (in seconds or zeit/ms format: 1h, 7d, etc.)
JWT_EXPIRES_IN=7d

# API rate limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS allowed origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001`;
}

export function envLoggingSection(): string {
  return `# ============================================
# Logging & Monitoring
# ============================================

# Log level (fatal | error | warn | info | debug | trace)
LOG_LEVEL=info

# Pretty print logs in development
LOG_PRETTY=true

# Sentry DSN (error tracking)
SENTRY_DSN=

# Sentry environment
SENTRY_ENVIRONMENT=development

# ============================================
# Vector Database (pgvector)
# ============================================

# Embedding model for vector search
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Vector similarity threshold
VECTOR_SIMILARITY_THRESHOLD=0.7`;
}
