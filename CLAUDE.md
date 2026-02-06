# Flusk Platform

## Project Overview
Flusk is an LLM API optimization infrastructure platform that helps companies 
reduce LLM costs by converting wasteful API calls into deterministic automation.

## Tech Stack
- Runtime: Platformatic Watt 3.37+ with Fastify v5
- Database: PostgreSQL 16 + pgvector
- Cache/Queue: Redis 7 + Streams
- Schema: TypeBox → JSON Schema
- Languages: TypeScript (Node.js 22+), Python 3.11+ (FastAPI for ML)

## Architecture Principles
1. Composable Monolith — single deployment, plugin-based isolation
2. Schema-first — TypeBox definitions generate everything
3. Pure business logic — functions have no side effects
4. Resources = I/O only — all database/API calls isolated

## Folder Structure
packages/
├── entities/        # SOURCE OF TRUTH — Schema definitions
├── types/           # TypeScript types + JSON Schema
├── resources/       # DB repositories, API clients
├── business-logic/  # Pure functions (no I/O)
├── execution/       # Routes, plugins, middleware, hooks
├── sdk/             # Customer SDKs (Node.js, Python)
└── cli/             # Flusk CLI (flusk g, flusk migrate)

## Code Style
- ESM only, no CommonJS
- Strict TypeScript
- Named exports preferred
- One function per file in business-logic/
- Fastify plugin encapsulation pattern
