-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  settings TEXT,
  api_key_hash TEXT,
  max_users INTEGER DEFAULT 10,
  max_solutions INTEGER DEFAULT 25,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'builder', 'user')),
  team TEXT,
  avatar_url TEXT,
  last_active_at DATETIME,
  preferences TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Solutions
CREATE TABLE IF NOT EXISTS solutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'testing', 'published', 'archived')),
  solution_type TEXT NOT NULL CHECK (solution_type IN ('custom', 'rovo-agent', 'gemini', 'slack-workflow', 'zapier', 'slm')),
  prompt TEXT,
  schema TEXT,
  config TEXT,
  tags TEXT,
  intent_patterns TEXT,
  usage_count INTEGER DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id),
  published_at DATETIME,
  test_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  UNIQUE(tenant_id, slug)
);

-- Queries (observability)
CREATE TABLE IF NOT EXISTS queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  intent TEXT,
  confidence REAL,
  resolved_to INTEGER REFERENCES solutions(id),
  was_fallback INTEGER DEFAULT 0,
  model TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  token_cost REAL DEFAULT 0,
  latency_ms INTEGER,
  source TEXT DEFAULT 'agent' CHECK (source IN ('agent', 'web', 'api')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feature Requests
CREATE TABLE IF NOT EXISTS feature_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  query_id INTEGER REFERENCES queries(id),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'building', 'testing', 'published', 'rejected')),
  frequency INTEGER DEFAULT 1,
  solution_id INTEGER REFERENCES solutions(id),
  assigned_to INTEGER REFERENCES users(id),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  similar_queries TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_solutions_tenant ON solutions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_solutions_status ON solutions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_queries_tenant ON queries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_queries_user ON queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_fallback ON queries(tenant_id, was_fallback);
CREATE INDEX IF NOT EXISTS idx_feature_requests_tenant ON feature_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(tenant_id, status);
