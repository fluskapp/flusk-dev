# ADR-002: node:sqlite Over External Dependencies

## Status: Accepted (Feb 2026)

## Context
CLI-first pivot needs local storage. Options:
1. better-sqlite3 (native addon, 12.6.2)
2. node:sqlite (built into Node 22+)
3. libsql (Turso's fork)

## Decision
Use `node:sqlite` (DatabaseSync) from Node.js built-in modules.

## Why
- Zero npm dependencies — no native compilation issues
- Ships with Node 22+ which is our minimum version
- Synchronous API (DatabaseSync) is fine for CLI tools
- Reduces install size and complexity
- Aligns with "boring tools" philosophy

## Consequences
- Requires Node 22+ (already our minimum)
- API is simpler than better-sqlite3 (fewer features)
- No WAL mode control (may matter for concurrent access)
- If we need async, will need to wrap or switch
