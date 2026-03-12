# @flusk/platform

Platformatic DB package for the Flusk platform layer — multi-tenant schema, auth/roles, solutions, guards.

## Schema

3 migrations covering:

- **001** — Core tables: `tenants`, `users`, `solutions`, `queries`, `feature_requests`
- **002** — Auth/access: `roles`, `solution_access`, `guards`, `okta_sessions`, `publish_logs`
- **003** — Security hardening: OAuth state/CSRF, token encryption IVs, per-tenant email uniqueness, soft-delete indexes

## Auth & Roles

User roles: `admin`, `builder`, `user`

Role permissions (from seed data):
- `engineering` — `solutions.view`, `solutions.publish`, `solutions.build`, `guards.manage`
- `sales` — `solutions.view`
- `everyone` (default) — `solutions.view`

Solution access types: `all`, `role`, `team`, `user`, `group`

Guard types: `rate-limit`, `budget`, `time-window`, `approval`, `ip-whitelist`, `okta-group`

## Usage

```bash
# Apply migrations
pnpm migrate

# Seed with demo data (Acme Corp tenant, 3 users, 5 solutions)
pnpm seed

# Start Platformatic DB server
pnpm start
```

## Config

`platformatic.json` — Platformatic DB config with OpenAPI enabled and role-based authorization rules.
Uses `{PLT_ADMIN_SECRET}` env var for admin access.
