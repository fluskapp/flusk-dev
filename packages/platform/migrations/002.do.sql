-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT, -- JSON array of permission strings
  is_default INTEGER DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, name)
);

-- Solution Access
CREATE TABLE IF NOT EXISTS solution_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  solution_id INTEGER NOT NULL REFERENCES solutions(id),
  access_type TEXT NOT NULL CHECK (access_type IN ('all', 'role', 'team', 'user', 'group')),
  access_value TEXT, -- role name, team name, user ID, or Okta group ID. NULL when access_type=all
  granted_by INTEGER NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Guards
CREATE TABLE IF NOT EXISTS guards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  solution_id INTEGER NOT NULL REFERENCES solutions(id),
  guard_type TEXT NOT NULL CHECK (guard_type IN ('rate-limit', 'budget', 'time-window', 'approval', 'ip-whitelist', 'okta-group')),
  config TEXT NOT NULL, -- JSON guard config
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Okta Sessions
CREATE TABLE IF NOT EXISTS okta_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  okta_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  groups TEXT, -- JSON array of Okta group names
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  id_token TEXT,
  expires_at DATETIME NOT NULL,
  last_verified_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, user_id)
);

-- Publish Logs
CREATE TABLE IF NOT EXISTS publish_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  solution_id INTEGER NOT NULL REFERENCES solutions(id),
  action TEXT NOT NULL CHECK (action IN ('publish', 'unpublish', 'rollback', 'update-access', 'update-guards')),
  from_status TEXT,
  to_status TEXT,
  target_audience TEXT, -- JSON snapshot of access rules
  metadata TEXT, -- JSON additional context
  performed_by INTEGER NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_solution_access_solution ON solution_access(solution_id);
CREATE INDEX IF NOT EXISTS idx_solution_access_tenant ON solution_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guards_solution ON guards(solution_id);
CREATE INDEX IF NOT EXISTS idx_guards_tenant ON guards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_okta_sessions_user ON okta_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_okta_sessions_tenant ON okta_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_publish_logs_solution ON publish_logs(solution_id);
CREATE INDEX IF NOT EXISTS idx_publish_logs_tenant ON publish_logs(tenant_id);
