/**
 * Unit tests for migration generators (SQLite + Postgres)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  generateMigrationSql,
  generatePostgresMigrationSql,
} from './generate-migration.js';
import type { EntitySchema } from './entity-schema.types.js';

describe('Generate Migration SQL', () => {
  test('generates CREATE TABLE with base columns', () => {
    const schema: EntitySchema = {
      name: 'Product',
      fields: {
        title: { type: 'string', required: true },
      },
    };
    const sql = generateMigrationSql(schema);
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS'));
    assert.ok(sql.includes('id TEXT PRIMARY KEY'));
    assert.ok(sql.includes('created_at TEXT NOT NULL'));
    assert.ok(sql.includes('title TEXT NOT NULL'));
  });

  test('generates indexes for indexed fields', () => {
    const schema: EntitySchema = {
      name: 'Call',
      fields: {
        model: { type: 'string', index: true },
      },
    };
    const sql = generateMigrationSql(schema);
    assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS'));
    assert.ok(sql.includes('model'));
  });

  test('generates foreign key for belongs-to', () => {
    const schema: EntitySchema = {
      name: 'Pattern',
      fields: {
        sessionId: { type: 'uuid', required: true },
      },
      relations: {
        session: {
          entity: 'ProfileSession',
          type: 'belongs-to',
          foreignKey: 'sessionId',
        },
      },
    };
    const sql = generateMigrationSql(schema);
    assert.ok(sql.includes('FOREIGN KEY'));
    assert.ok(sql.includes('REFERENCES'));
  });

  test('maps boolean to INTEGER with 0/1 defaults', () => {
    const schema: EntitySchema = {
      name: 'Flag',
      fields: {
        active: { type: 'boolean', required: true, default: false },
        enabled: { type: 'boolean', required: true, default: true },
      },
    };
    const sql = generateMigrationSql(schema);
    assert.ok(sql.includes('active INTEGER NOT NULL DEFAULT 0'));
    assert.ok(sql.includes('enabled INTEGER NOT NULL DEFAULT 1'));
  });

  test('maps json with proper default', () => {
    const schema: EntitySchema = {
      name: 'Record',
      fields: {
        tokens: { type: 'json', required: true, default: '{}' },
      },
    };
    const sql = generateMigrationSql(schema);
    assert.ok(sql.includes("tokens TEXT NOT NULL DEFAULT '{}'"));
  });

  test('maps number to REAL', () => {
    const schema: EntitySchema = {
      name: 'Metric',
      fields: {
        cost: { type: 'number', required: true, default: 0 },
      },
    };
    const sql = generateMigrationSql(schema);
    assert.ok(sql.includes('cost REAL NOT NULL DEFAULT 0'));
  });

  test('string default is quoted', () => {
    const schema: EntitySchema = {
      name: 'Item',
      fields: {
        purpose: { type: 'string', required: true, default: 'optimization' },
      },
    };
    const sql = generateMigrationSql(schema);
    assert.ok(sql.includes("purpose TEXT NOT NULL DEFAULT 'optimization'"));
  });

  test('always includes created_at index', () => {
    const schema: EntitySchema = {
      name: 'Thing',
      fields: {
        name: { type: 'string' },
      },
    };
    const sql = generateMigrationSql(schema);
    assert.ok(sql.includes('idx_things_created_at'));
  });

  test('nullable fields omit NOT NULL', () => {
    const schema: EntitySchema = {
      name: 'Entry',
      fields: {
        organizationId: { type: 'string' },
      },
    };
    const sql = generateMigrationSql(schema);
    assert.ok(sql.includes('organization_id TEXT'));
    assert.ok(!sql.includes('organization_id TEXT NOT NULL'));
  });

  test('LLM call entity matches hand-written pattern', () => {
    const schema: EntitySchema = {
      name: 'LLMCall',
      fields: {
        provider: { type: 'string', required: true },
        model: { type: 'string', required: true, index: true },
        prompt: { type: 'string', required: true },
        promptHash: { type: 'string', required: true, index: true },
        tokens: { type: 'json', required: true, default: '{}' },
        cost: { type: 'number', required: true, default: 0 },
        response: { type: 'string', required: true, default: '' },
        cached: { type: 'boolean', required: true, default: false },
        organizationId: { type: 'string' },
        consentGiven: { type: 'boolean', required: true, default: true },
        consentPurpose: {
          type: 'string',
          required: true,
          default: 'optimization',
        },
      },
    };
    const sql = generateMigrationSql(schema);

    // Core structure
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS llm_calls'));
    assert.ok(
      sql.includes(
        "id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))",
      ),
    );

    // Field types and constraints
    assert.ok(sql.includes('provider TEXT NOT NULL'));
    assert.ok(sql.includes('model TEXT NOT NULL'));
    assert.ok(sql.includes("tokens TEXT NOT NULL DEFAULT '{}'"));
    assert.ok(sql.includes('cost REAL NOT NULL DEFAULT 0'));
    assert.ok(sql.includes("response TEXT NOT NULL DEFAULT ''"));
    assert.ok(sql.includes('cached INTEGER NOT NULL DEFAULT 0'));
    assert.ok(sql.includes('organization_id TEXT'));
    assert.ok(sql.includes('consent_given INTEGER NOT NULL DEFAULT 1'));
    assert.ok(
      sql.includes("consent_purpose TEXT NOT NULL DEFAULT 'optimization'"),
    );

    // Timestamps
    assert.ok(
      sql.includes("created_at TEXT NOT NULL DEFAULT (datetime('now'))"),
    );
    assert.ok(
      sql.includes("updated_at TEXT NOT NULL DEFAULT (datetime('now'))"),
    );

    // Indexes
    assert.ok(sql.includes('idx_llm_calls_model'));
    assert.ok(sql.includes('idx_llm_calls_prompt_hash'));
    assert.ok(sql.includes('idx_llm_calls_created_at'));
  });
});

describe('Generate Postgres Migration SQL', () => {
  test('uses Postgres types and defaults', () => {
    const schema: EntitySchema = {
      name: 'LLMCall',
      fields: {
        cached: { type: 'boolean', required: true, default: false },
        tokens: { type: 'json', required: true, default: '{}' },
        cost: { type: 'number', required: true, default: 0 },
      },
    };
    const sql = generatePostgresMigrationSql(schema);
    assert.ok(sql.includes('id UUID PRIMARY KEY DEFAULT gen_random_uuid()'));
    assert.ok(sql.includes('cached BOOLEAN NOT NULL DEFAULT FALSE'));
    assert.ok(sql.includes("tokens JSONB NOT NULL DEFAULT '{}'"));
    assert.ok(sql.includes('cost DOUBLE PRECISION NOT NULL DEFAULT 0'));
    assert.ok(
      sql.includes('created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()'),
    );
  });
});
