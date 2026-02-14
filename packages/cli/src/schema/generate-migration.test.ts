/**
 * Unit tests for SQLite migration generator
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { generateMigrationSql } from './generate-migration.js';
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

  test('maps boolean to INTEGER', () => {
    const schema: EntitySchema = {
      name: 'Flag',
      fields: { active: { type: 'boolean', default: false } },
    };
    const sql = generateMigrationSql(schema);
    assert.ok(sql.includes('active INTEGER'));
  });
});
